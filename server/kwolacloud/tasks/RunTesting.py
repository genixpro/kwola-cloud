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
from kwolacloud.components.KubernetesJobProcess import KubernetesJobProcess


def runTesting(testingRunId):
    logging.info(f"Starting testing run {testingRunId}")
    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        logging.error(f"Error! {testingRunId} not found.")
        return

    configDir = mountTestingRunStorageDrive(testingRunId)
    if configDir is None:
        return {"success":False}

    if run.startTime is None:
        run.startTime = datetime.datetime.now()

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

            with open(configFilePath, 'wt') as configFile:
                json.dump(kwolaConfigData, configFile)
        else:
            with open(configFilePath, 'rt') as configFile:
                kwolaConfigData = json.load(configFile)

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
                job = KubernetesJob(module="kwolacloud.tasks.SingleTestingStepTask",
                                       data={
                                            "testingRunId": testingRunId,
                                            "testingStepsCompleted": completedTestingSteps,
                                            "maxSessionsToBill": countTestingSessionsNeeded - countTestingSessionsStarted
                                       },
                                    referenceId=f"{testingRunId}-testingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}",
                                    image="testingworker",
                                    cpuRequest="900m",
                                    cpuLimit="1500m",
                                    memoryRequest="2.5Gi",
                                    memoryLimit="3.5Gi"
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
                    job.cleanup()
                    if isinstance(result, dict) and result['success']:
                        logging.info(f"Finished a testing step for run {testingRunId}")
                        countTrainingIterationsNeeded += trainingIterationsNeededPerSession * kwolaConfigData['web_session_parallel_execution_sessions']
                        run.testingSessionsCompleted += kwolaConfigData['web_session_parallel_execution_sessions']
                        completedTestingSteps += 1
                        run.save()
                    else:
                        logging.error("Testing run appears to have failed. Trying it again...")
                        # Double check that the stripe subscription is still good. If the testing step failed because our
                        # stripe subscription is bad, we should just exit immediately.
                        if not verifyStripeSubscription(run):
                            shouldExit = True
                            break

            if countTrainingIterationsCompleted < countTrainingIterationsNeeded and currentTrainingStepJob is None:
                logging.info(f"Starting a training step for run {testingRunId}")
                currentTrainingStepJob = KubernetesJob(module="kwolacloud.tasks.SingleTrainingStepTask",
                                                       data={
                                                            "testingRunId":testingRunId,
                                                            "trainingStepsCompleted": completedTrainingSteps
                                                       },
                                                       referenceId=f"{testingRunId}-trainingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}",
                                                       image="trainingworker",
                                                       cpuRequest="2500m",
                                                       cpuLimit="3500m",
                                                       memoryRequest="2.5Gi",
                                                       memoryLimit="3.5Gi"
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

            time.sleep(10)

        if currentTrainingStepJob is not None:
            currentTrainingStepJob.wait()

            completedTrainingSteps += 1
            run.trainingStepsCompleted += 1
            run.save()
            currentTrainingStepJob.cleanup()

        for job in testingStepActiveJobs:
            job.wait()

            run.testingSessionsCompleted += kwolaConfigData['web_session_parallel_execution_sessions']
            completedTestingSteps += 1
            run.save()
            job.cleanup()

        logging.info(f"Finished testing run {testingRunId}")
        run.status = "completed"
        run.save()
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runTesting)
    task.run()


