#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from kwola.components.environments.WebEnvironment import WebEnvironment
import os.path
import json
from ..config.config import getKwolaConfigurationData
import time
import datetime
from kwola.config.config import Configuration
import logging
from .utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive, verifyStripeSubscription
from ..components.KubernetesJob import KubernetesJob
import random
from ..config.config import loadConfiguration, getKwolaConfiguration
from kwolacloud.components.KubernetesJobProcess import KubernetesJobProcess
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
import tempfile
import traceback
from pprint import pformat
from ..helpers.slack import postToKwolaSlack
from ..helpers.email import sendFinishTestingRunEmail
from ..helpers.auth0 import getUserProfileFromId
from ..datamodels.ApplicationModel import ApplicationModel
from kwola.datamodels.BugModel import BugModel
from dateutil.relativedelta import relativedelta
from kwolacloud.helpers.slack import postToCustomerSlack


def runTesting(testingRunId):
    logging.info(f"Starting testing run {testingRunId}")
    run = TestingRun.objects(id=testingRunId).first()

    configData = loadConfiguration()

    if run is None:
        errorMessage = f"Error! {testingRunId} not found."
        logging.error(f"[{os.getpid()}] {errorMessage}")
        return {"success": False, "exception": errorMessage}

    if not configData['features']['localRuns']:
        configDir = mountTestingRunStorageDrive(run.applicationId)
        if configDir is None:
            errorMessage = f"{traceback.format_exc()}"
            logging.error(f"[{os.getpid()}] {errorMessage}")
            return {"success": False, "exception": errorMessage}
    else:
        if not os.path.exists("data"):
            os.mkdir("data")

        configDir = os.path.join("data", run.applicationId)

        if not os.path.exists(configDir):
            os.mkdir(configDir)

    if run.startTime is None:
        run.startTime = datetime.datetime.now()

    if run.predictedEndTime is None:
        run.predictedEndTime = run.startTime + relativedelta(hours=run.configuration.hours)

    run.status = "running"
    run.save()

    try:
        configFilePath = os.path.join(configDir, "kwola.json")

        runConfiguration = run.configuration

        if not os.path.exists(configFilePath):
            kwolaConfigData = getKwolaConfigurationData()

            kwolaConfigData['url'] = runConfiguration.url
            kwolaConfigData['email'] = runConfiguration.email
            kwolaConfigData['password'] = runConfiguration.password
            kwolaConfigData['name'] = runConfiguration.name
            kwolaConfigData['paragraph'] = runConfiguration.paragraph
            kwolaConfigData['enableRandomNumberCommand'] = runConfiguration.enableRandomNumberCommand
            kwolaConfigData['enableRandomBracketCommand'] = runConfiguration.enableRandomBracketCommand
            kwolaConfigData['enableRandomMathCommand'] = runConfiguration.enableRandomMathCommand
            kwolaConfigData['enableRandomOtherSymbolCommand'] = runConfiguration.enableRandomOtherSymbolCommand
            kwolaConfigData['enableDoubleClickCommand'] = runConfiguration.enableDoubleClickCommand
            kwolaConfigData['enableRightClickCommand'] = runConfiguration.enableRightClickCommand
            kwolaConfigData['autologin'] = runConfiguration.autologin
            kwolaConfigData['prevent_offsite_links'] = runConfiguration.preventOffsiteLinks
            kwolaConfigData['testing_sequence_length'] = runConfiguration.testingSequenceLength
            kwolaConfigData['web_session_restrict_url_to_regexes'] = runConfiguration.urlWhitelistRegexes

            with open(configFilePath, 'wt') as configFile:
                json.dump(kwolaConfigData, configFile)
        else:
            with open(configFilePath, 'rt') as configFile:
                kwolaConfigData = json.load(configFile)

        logging.info(f"Testing Run starting with configuration: \n{pformat(kwolaConfigData)}")

        # We load up a single web session just to ensure we can access the target url
        config = Configuration(configDir)
        environment = WebEnvironment(config, sessionLimit=1)
        environment.shutdown()
        del environment

        # Now we just loop until completion
        countTestingSessionsStarted = 0
        countTestingSessionsNeeded = 0

        # Make a purely rule-of-thumb estimate on how long an average testing session should take, in seconds
        expectedSessionTime = runConfiguration.testingSequenceLength * 20

        remainingTestingSessions = runConfiguration.totalTestingSessions - run.testingSessionsCompleted

        targetFinishedLaunchingTime = run.startTime \
                       + datetime.timedelta(hours=run.configuration.hours) \
                       - datetime.timedelta(seconds=expectedSessionTime)

        timeRemaining = max(1, (targetFinishedLaunchingTime - datetime.datetime.now()).total_seconds())

        testingSessionsPerSecond = remainingTestingSessions / timeRemaining

        trainingIterationsNeededPerSession = (kwolaConfigData['iterations_per_sample'] * runConfiguration.testingSequenceLength) / (kwolaConfigData['batch_size'] * kwolaConfigData['batches_per_iteration'])

        countTrainingIterationsNeeded = 0
        countTrainingIterationsCompleted = 0

        startTime = datetime.datetime.now()

        testingStepActiveJobs = []
        testingStepCompletedJobs = []

        completedTrainingSteps = run.trainingStepsCompleted
        completedTestingSteps = int(run.testingSessionsCompleted / kwolaConfigData['web_session_parallel_execution_sessions'])
        currentTrainingStepJob = None
        shouldExit = False

        while run.testingSessionsCompleted < runConfiguration.totalTestingSessions and not shouldExit:
            timeElapsed = (datetime.datetime.now() - startTime).total_seconds()

            countTestingSessionsNeeded = min(remainingTestingSessions, timeElapsed * testingSessionsPerSecond)

            while countTestingSessionsStarted < countTestingSessionsNeeded:
                logging.info(f"Starting a testing step for run {testingRunId}")
                if configData['features']['localRuns']:
                    job = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.SingleTestingStepTaskLocal"], {
                        "testingRunId": testingRunId,
                        "testingStepsCompleted": completedTestingSteps
                    }, timeout=7200, config=getKwolaConfiguration(), logId=None)
                else:
                    job = KubernetesJob(module="kwolacloud.tasks.SingleTestingStepTask",
                                           data={
                                                "testingRunId": testingRunId,
                                                "testingStepsCompleted": completedTestingSteps
                                           },
                                        referenceId=f"{testingRunId}-testingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}",
                                        image="worker",
                                        cpuRequest="1600m",
                                        cpuLimit="2500m",
                                        memoryRequest="3.5Gi",
                                        memoryLimit="5.0Gi"
                                        )
                job.start()
                testingStepActiveJobs.append(job)
                countTestingSessionsStarted += kwolaConfigData['web_session_parallel_execution_sessions']

            toRemove = []
            for job in testingStepActiveJobs:
                if job.ready():
                    logging.info("Ready job has been found!")
                    toRemove.append(job)
            for job in toRemove:
                testingStepActiveJobs.remove(job)
                testingStepCompletedJobs.append(job)
                # We only count this testing step if it actually completed successfully, because
                # otherwise it needs to be done over again.
                if job.successful():
                    result = job.extractResultFromLogs()
                    if isinstance(result, dict) and result['success']:
                        logging.info(f"Finished a testing step for run {testingRunId} with name {job.kubeJobName()}")
                        job.cleanup()
                        countTrainingIterationsNeeded += trainingIterationsNeededPerSession * kwolaConfigData['web_session_parallel_execution_sessions']
                        run.testingSessionsCompleted += kwolaConfigData['web_session_parallel_execution_sessions']
                        completedTestingSteps += 1
                        run.save()
                    else:
                        logging.error("Testing run appears to have failed. Trying it again...")

                        postToKwolaSlack(f"A testing step appears to have failed on testing run {testingRunId} with job id {job.referenceId}")

                        # Double check that the stripe subscription is still good. If the testing step failed because our
                        # stripe subscription is bad, we should just exit immediately.
                        #if not verifyStripeSubscription(run):
                        #    shouldExit = True
                        #    break

            if countTrainingIterationsCompleted < countTrainingIterationsNeeded and currentTrainingStepJob is None:
                logging.info(f"Starting a training step for run {testingRunId}")
                if configData['features']['localRuns']:
                    currentTrainingStepJob = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.SingleTrainingStepTaskLocal"], {
                        "testingRunId":testingRunId,
                        "trainingStepsCompleted": completedTrainingSteps
                    }, timeout=7200, config=getKwolaConfiguration(), logId=None)
                else:
                    currentTrainingStepJob = KubernetesJob(module="kwolacloud.tasks.SingleTrainingStepTask",
                                                           data={
                                                                "testingRunId":testingRunId,
                                                                "trainingStepsCompleted": completedTrainingSteps
                                                           },
                                                           referenceId=f"{testingRunId}-trainingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}",
                                                           image="worker",
                                                           cpuRequest="6000m",
                                                           cpuLimit=None,
                                                           memoryRequest="12.0Gi",
                                                           memoryLimit=None,
                                                           gpu=True
                                                           )
                currentTrainingStepJob.start()

            if currentTrainingStepJob is not None and currentTrainingStepJob.ready():
                logging.info(f"Finished a training step for run {testingRunId}")
                pastTrainingStepJob = currentTrainingStepJob
                currentTrainingStepJob = None
                countTrainingIterationsCompleted += kwolaConfigData['iterations_per_training_step']
                completedTrainingSteps += 1
                run.trainingStepsCompleted += 1
                run.save()
                if pastTrainingStepJob.successful():
                    result = pastTrainingStepJob.extractResultFromLogs()
                    if result['success']:
                        pastTrainingStepJob.cleanup()
                    else:
                        errorMessage = f"A testing step appears to have failed on testing run {testingRunId} with job id {pastTrainingStepJob.referenceId}."
                        if 'exception' in result:
                            errorMessage += "\n\n" + result['exception']

                        logging.error(errorMessage)
                else:
                    errorMessage = f"A training step appears to have failed on testing run {testingRunId} with job id {pastTrainingStepJob.referenceId}. The job did not produce a result object."
                    logging.error(errorMessage)

            time.sleep(60)

#         if currentTrainingStepJob is not None:
#             currentTrainingStepJob.wait()

#             completedTrainingSteps += 1
#             run.trainingStepsCompleted += 1
#             run.save()
#             currentTrainingStepJob.cleanup()

        for job in testingStepActiveJobs:
            job.wait()

            run.testingSessionsCompleted += kwolaConfigData['web_session_parallel_execution_sessions']
            completedTestingSteps += 1
            run.save()
            job.cleanup()

            result = job.extractResultFromLogs()
            if not result['success']:
                errorMessage = f"A testing step appears to have failed on testing run {testingRunId} with job id {job.referenceId}."
                if 'exception' in result:
                    errorMessage += "\n\n" + result['exception']

                logging.error(errorMessage)

        logging.info(f"Finished testing run {testingRunId}")
        run.status = "completed"
        run.endTime = datetime.datetime.now()
        run.save()

        application = ApplicationModel.objects(id=run.applicationId).limit(1).first()
        bugCount = BugModel.objects(owner=application.owner, testingRunId=run.id, isMuted=False).count()

        if application.enableEmailTestingRunCompletedNotifications:
            sendFinishTestingRunEmail(application, run, bugCount)

        if application.enableSlackTestingRunCompletedNotifications:
            postToCustomerSlack(f"A testing run has completed and found {bugCount} errors. View the results here: {configData['frontend']['url']}app/dashboard/testing_runs/{run.id}", application)

    except Exception as e:
        errorMessage = f"Error in the primary RunTesting job for the testing run with id {testingRunId}:\n\n{traceback.format_exc()}"
        logging.error(f"[{os.getpid()}] {errorMessage}")
        return {"success": False, "exception": errorMessage}
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runTesting)
    task.run()


