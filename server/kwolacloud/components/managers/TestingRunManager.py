#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ...config.config import getKwolaConfigurationData
from ...config.config import loadConfiguration, getKwolaConfiguration
from ...datamodels.ApplicationModel import ApplicationModel
from ...datamodels.TestingRun import TestingRun
from ...helpers.email import sendFinishTestingRunEmail
from ...tasks.utils import mountTestingRunStorageDrive, verifyStripeSubscription, unmountTestingRunStorageDrive
from dateutil.relativedelta import relativedelta
from google.cloud import storage
from kwola.components.environments.WebEnvironment import WebEnvironment
from kwola.components.agents.DeepLearningAgent import DeepLearningAgent
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.config.config import KwolaCoreConfiguration
from kwola.datamodels.BugModel import BugModel
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from kwola.components.utils.retry import autoretry
from kwolacloud.components.utils.KubernetesJob import KubernetesJob
from kwolacloud.helpers.slack import postToCustomerSlack, postToKwolaSlack
from kwolacloud.helpers.webhook import sendCustomerWebhook
from kwola.components.utils.charts import generateAllCharts
from pprint import pformat
import datetime
import google
import google.cloud
import json
import logging
import os.path
import random
import time
import traceback
import zipfile
from mongoengine.queryset.visitor import Q


class TestingRunManager:
    def __init__(self, testingRunId):
        logging.info(f"Starting testing run {testingRunId}")

        self.testingRunId = testingRunId
        self.run = None
        self.cloudConfigData = loadConfiguration()
        self.configDir = None
        self.config = None
        self.shouldExit = False
        self.storageClient = storage.Client()
        self.applicationStorageBucket = None


    def mountStorageDrive(self):
        if not self.cloudConfigData['features']['localRuns']:
            self.configDir = mountTestingRunStorageDrive(self.run.applicationId)
            if self.configDir is None:
                errorMessage = f"{traceback.format_exc()}"
                logging.error(f"[{os.getpid()}] {errorMessage}")
                raise RuntimeError(f"Unable to mount the gcs storage drive for application id {self.run.applicationId}")
        else:
            if not os.path.exists("data"):
                os.mkdir("data")

            self.configDir = os.path.join("data", self.run.applicationId)

            if not os.path.exists(self.configDir):
                os.mkdir(self.configDir)

    def updateApplicationObjectForStart(self):
        # Make sure that this application has recorded that at least one testing run has launched
        self.application = ApplicationModel.objects(id=self.run.applicationId).limit(1).first()
        self.application.hasFirstTestingRunLaunched = True
        self.application.lastTestingDate = datetime.datetime.now()
        self.application.save()


    def updateKwolaConfigJSONFile(self):
        configFilePath = os.path.join(self.configDir, "kwola.json")

        runConfiguration = self.run.configuration

        kwolaConfigData = getKwolaConfigurationData()

        kwolaConfigData['applicationId'] = self.run.applicationId
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
        kwolaConfigData['enableTypeEmail'] = runConfiguration.enableTypeEmail
        kwolaConfigData['enableTypePassword'] = runConfiguration.enableTypePassword
        kwolaConfigData['enableScrolling'] = runConfiguration.enableScrolling
        kwolaConfigData['enableRandomLettersCommand'] = runConfiguration.enableRandomLettersCommand
        kwolaConfigData['enableRandomAddressCommand'] = runConfiguration.enableRandomAddressCommand
        kwolaConfigData['enableRandomEmailCommand'] = runConfiguration.enableRandomEmailCommand
        kwolaConfigData['enableRandomPhoneNumberCommand'] = runConfiguration.enableRandomPhoneNumberCommand
        kwolaConfigData['enableRandomParagraphCommand'] = runConfiguration.enableRandomParagraphCommand
        kwolaConfigData['enableRandomDateTimeCommand'] = runConfiguration.enableRandomDateTimeCommand
        kwolaConfigData['enableRandomCreditCardCommand'] = runConfiguration.enableRandomCreditCardCommand
        kwolaConfigData['enableRandomURLCommand'] = runConfiguration.enableRandomURLCommand
        kwolaConfigData['autologin'] = runConfiguration.autologin
        kwolaConfigData['prevent_offsite_links'] = runConfiguration.preventOffsiteLinks
        kwolaConfigData['testing_sequence_length'] = runConfiguration.testingSequenceLength
        if runConfiguration.enablePathWhitelist:
            kwolaConfigData['web_session_restrict_url_to_regexes'] = runConfiguration.urlWhitelistRegexes
        else:
            kwolaConfigData['web_session_restrict_url_to_regexes'] = []
        kwolaConfigData['custom_typing_action_strings'] = runConfiguration.customTypingActionStrings
        kwolaConfigData['enable_5xx_error'] = runConfiguration.enable5xxError
        kwolaConfigData['enable_400_error'] = runConfiguration.enable400Error
        kwolaConfigData['enable_401_error'] = runConfiguration.enable401Error
        kwolaConfigData['enable_403_error'] = runConfiguration.enable403Error
        kwolaConfigData['enable_404_error'] = runConfiguration.enable404Error
        kwolaConfigData['enable_javascript_console_error'] = runConfiguration.enableJavascriptConsoleError
        kwolaConfigData['enable_unhandled_exception_error'] = runConfiguration.enableUnhandledExceptionError

        if not self.cloudConfigData['features']['localRuns']:
            # We have to write directly to the google cloud storage bucket because of the way that the storage
            # drives get mounted through fuse.
            configFileBlob = storage.Blob("kwola.json", self.applicationStorageBucket)
            configFileBlob.upload_from_string(json.dumps(kwolaConfigData, indent=4, sort_keys=True))

        # Also write a copy locally.
        try:
            with open(configFilePath, 'wt') as configFile:
                json.dump(kwolaConfigData, configFile, indent=4, sort_keys=True)
        except OSError:
            pass


    def doInitialBrowserSession(self):
        # We load up a single web session just to ensure we can access the target url
        environment = WebEnvironment(self.config, sessionLimit=1)
        environment.shutdown()
        del environment


    def loadTestingRun(self):
        self.run = TestingRun.objects(id=self.testingRunId).first()

        if self.run is None:
            errorMessage = f"Error! {self.testingRunId} not found."
            logging.error(f"[{os.getpid()}] {errorMessage}")
            raise RuntimeError(f"Unable to find the testing run object with id {self.testingRunId}")

        self.applicationStorageBucket = storage.Bucket(self.storageClient, "kwola-testing-run-data-" + self.run.applicationId)

    def doTestingRunInitializationIfNeeded(self):
        if self.run.status == "created":
            if self.run.startTime is None:
                self.run.startTime = datetime.datetime.now()

            if self.run.predictedEndTime is None:
                self.run.predictedEndTime = self.run.startTime + relativedelta(hours=self.run.configuration.hours + 1, minute=30, second=0, microsecond=0)

            self.run.status = "running"

            if self.application.testingRunStartedWebhookURL:
                sendCustomerWebhook(self.application, "testingRunStartedWebhookURL", json.loads(self.run.to_json()))

            self.run.save()

            self.config = KwolaCoreConfiguration(self.configDir)

            self.doInitialBrowserSession()

    def launchTestingStepsIfNeeded(self):
        while self.calculateNumberOfTestingSessionsToStart() > 0:
            self.launchTestingStep()


    def calculateTestingSessionsNeeded(self):
        # Make a purely rule-of-thumb estimate on how long an average testing session should take, in seconds
        expectedSessionTime = (self.run.configuration.testingSequenceLength * 30)

        totalExecutionTime = (self.run.configuration.hours * 3600) - expectedSessionTime

        testingSessionsPerSecond = self.run.configuration.totalTestingSessions / totalExecutionTime

        timeElapsed = (datetime.datetime.now() - self.run.startTime).total_seconds()

        countTestingSessionsNeeded = min(self.run.configuration.totalTestingSessions, timeElapsed * testingSessionsPerSecond)

        return countTestingSessionsNeeded


    def calculateNumberOfTestingSessionsToStart(self):
        needed = self.calculateTestingSessionsNeeded()

        current = self.run.testingSessionsCompleted + len(self.run.runningTestingStepJobIds) * self.config['web_session_parallel_execution_sessions']

        return max(0, needed - current)

    def createTestingStepKubeJob(self, referenceId):
        completedTestingSteps = int(self.run.testingSessionsCompleted / self.config['web_session_parallel_execution_sessions'])

        job = KubernetesJob(module="kwolacloud.tasks.SingleTestingStepTask",
                               data={
                                    "testingRunId": self.run.id,
                                    "testingStepsCompleted": completedTestingSteps + len(self.run.runningTestingStepJobIds)
                               },
                            referenceId=referenceId,
                            image="worker",
                            cpuRequest="6000m",
                            cpuLimit="8000m",
                            memoryRequest="20.0Gi",
                            memoryLimit="20.0Gi"
                            )
        return job

    def launchTestingStep(self):
        logging.info(f"Starting a testing step for run {self.run.id}")

        completedTestingSteps = int(self.run.testingSessionsCompleted / self.config['web_session_parallel_execution_sessions'])

        jobId = f"{self.run.id}-testingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}"

        if self.cloudConfigData['features']['localRuns']:
            job = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.SingleTestingStepTaskLocal"], {
                "testingRunId": self.run.id,
                "testingStepsCompleted": completedTestingSteps + len(self.run.runningTestingStepJobIds)
            }, timeout=7200, config=getKwolaConfiguration(), logId=None)
        else:
            job = self.createTestingStepKubeJob(jobId)

        job.start()

        self.run.runningTestingStepJobIds.append(jobId)
        self.run.runningTestingStepStartTimes.append(datetime.datetime.now())
        self.run.save()

    def reviewRunningTestingSteps(self):
        trainingIterationsNeededPerSession = (self.config['iterations_per_sample'] * self.run.configuration.testingSequenceLength) / (self.config['batch_size'] * self.config['batches_per_iteration'])

        # This is only temporary, to be compatible with data that did not have runningTestingStepStartTimes.
        if len(self.run.runningTestingStepStartTimes) == 0 and len(self.run.runningTestingStepJobIds) > 0:
            self.run.runningTestingStepStartTimes = [datetime.datetime.now()] * len(self.run.runningTestingStepJobIds)
            self.run.save()

        def handleSuccess(result):
            self.run.trainingIterationsNeeded += trainingIterationsNeededPerSession * self.config['web_session_parallel_execution_sessions']
            self.run.testingSessionsCompleted += result['successfulExecutionSessions']
            self.run.testingSteps.append(result['testingStepId'])
            self.run.testingStepsNeedingSymbolProcessing.append(result['testingStepId'])

        def handleFailure():
            self.run.failedTestingSteps += 1

            # Double check that the stripe subscription is still good. If the testing step failed because our
            # stripe subscription is bad, we should just exit immediately.
            if not verifyStripeSubscription(self.run):
                self.shouldExit = True

            # Check if they deleted their application object, and if so, set code to exit.
            if ApplicationModel.objects(Q(status__exists=False) | Q(status="active"), id=self.run.applicationId).count() == 0:
                self.shouldExit = True

        jobsToRemove = []
        for jobId, startTime in zip(self.run.runningTestingStepJobIds, self.run.runningTestingStepStartTimes):
            timeElapsed = (datetime.datetime.now() - startTime).total_seconds()
            job = self.createTestingStepKubeJob(jobId)
            if not job.doesJobStillExist():
                logging.info(f"Job with id {jobId} was unexpectedly destroyed. We can't find its object in the kubernetes cluster.")
                jobsToRemove.append((jobId, job))
            elif job.ready():
                logging.info(f"Ready job has been found for run {self.run.id} with name {job.kubeJobName()}!")

                # We only count this testing step if it actually completed successfully, because
                # otherwise it needs to be done over again.
                if job.successful():
                    resultObj = job.getResult()
                    if resultObj is not None and resultObj.result is not None and resultObj.result['success']:
                        logging.info(f"Finished a testing step successfully for run {self.run.id} with name {job.kubeJobName()}")
                        handleSuccess(resultObj.result)
                    else:
                        logging.error(f"A testing step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}")
                        handleFailure()
                else:
                    logging.error(f"A testing step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}")
                    handleFailure()

                job.cleanup()
                jobsToRemove.append((jobId, job))
            elif timeElapsed > self.config['testing_step_timeout']:
                # First check to see if there was a result object. Sometimes jobs are timing out after completion for some bizarre reason.
                resultObj = job.getResult()
                if resultObj is not None and resultObj.result is not None:
                    if resultObj.result['success']:
                        logging.warning(f"A testing step has timed out for run {self.run.id} with name {job.kubeJobName()}, but it appears it to have run successfully but then continued running after completion. It produced a result object: {pformat(resultObj.result)}")
                        handleSuccess(resultObj.result)
                    else:
                        logging.error(f"A testing step has timed out on testing run {self.run.id} with job name {job.kubeJobName()}, but it also appears to have failed and then continued running after completion. It produced a result object: {pformat(resultObj.result)}")
                        handleFailure()
                else:
                    logging.error(f"A testing step appears to have timed out on testing run {self.run.id} with job name {job.kubeJobName()}. It has not produced a result object - presumably it is still running.")
                    handleFailure()

                job.cleanup()
                jobsToRemove.append((jobId, job))
            elif not job.ready() and job.getResult() is not None:
                resultObj = job.getResult()

                timePassed = abs((datetime.datetime.now() - resultObj.time).total_seconds())
                # Make sure at least 60 seconds has passed before we evaluate this result object.
                # This is to give the server enough time to shut down cleanly before we force
                # kill it as a timed out process.
                if timePassed > 60:
                    if resultObj.result['success']:
                        logging.warning(f"A testing step with id {self.run.id} and name {job.kubeJobName()} has finished successfully, but it appears to have been hung and did not exit cleanly. It had to be forcibly stopped. It produced a result object: {pformat(resultObj.result)}")
                        handleSuccess(resultObj.result)
                    else:
                        logging.error(f"A testing step has failed with id {self.run.id} with job name {job.kubeJobName()}. It also appears to have been hung on exit and did not exit cleanly, meaning we had to forcibly shut it down. It produced a result object: {pformat(resultObj.result)}")
                        handleFailure()

                    # We force cleaning up this task, because it is still running and thus if we don't forcibly clean it, it will hang around taking up resources.
                    job.cleanup()
                    jobsToRemove.append((jobId, job))

        for (jobId, job) in jobsToRemove:
            jobIndex = self.run.runningTestingStepJobIds.index(jobId)
            del self.run.runningTestingStepStartTimes[jobIndex]
            self.run.runningTestingStepJobIds.remove(jobId)

        self.run.save()

        return len(jobsToRemove)

    def createTrainingStepKubeJob(self, referenceId):
        job = KubernetesJob(module="kwolacloud.tasks.SingleTrainingStepTask",
                                               data={
                                                   "testingRunId": self.run.id,
                                                   "trainingStepsCompleted": self.run.trainingStepsCompleted
                                               },
                                               referenceId=referenceId,
                                               image="worker",
                                               cpuRequest="7000m",
                                               cpuLimit=None,
                                               memoryRequest="34.0Gi",
                                               memoryLimit=None,
                                               gpu=True
                                               )
        return job


    def launchTrainingStepIfNeeded(self):
        if self.run.trainingIterationsCompleted < self.run.trainingIterationsNeeded and \
                self.run.runningTrainingStepJobId is None and \
                not self.isTrainingFailureConditionsMet() and \
                self.run.testingSessionsCompleted > (1 * self.config['web_session_parallel_execution_sessions']):
            self.launchTrainingStep()


    def launchTrainingStep(self):
        logging.info(f"Starting a training step for run {self.run.id}")

        jobId = f"{self.run.id}-trainingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}"

        if self.cloudConfigData['features']['localRuns']:
            currentTrainingStepJob = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.SingleTrainingStepTaskLocal"], {
                "testingRunId": self.run.id,
                "trainingStepsCompleted": self.run.trainingStepsCompleted
            }, timeout=7200, config=getKwolaConfiguration(), logId=None)
        else:

            currentTrainingStepJob = self.createTrainingStepKubeJob(jobId)

        currentTrainingStepJob.start()

        self.run.runningTrainingStepJobId = jobId
        self.run.runningTrainingStepStartTime = datetime.datetime.now()
        self.run.save()

        logging.info(f"Training step has started with jobId {jobId}")

    def reviewRunningTrainingSteps(self):
        didTrainingStepFinish = False
        if self.run.runningTrainingStepJobId is not None:
            job = self.createTrainingStepKubeJob(self.run.runningTrainingStepJobId)

            # This line is just for backwards compatibility
            if self.run.runningTrainingStepStartTime is None:
                self.run.runningTrainingStepStartTime = datetime.datetime.now()
                self.run.save()

            timeElapsed = (datetime.datetime.now() - self.run.runningTrainingStepStartTime).total_seconds()

            if not job.doesJobStillExist():
                logging.info(f"Job {job.kubeJobName()} was unexpectedly destroyed. We can't find its object in the kubernetes cluster.")
                self.run.runningTrainingStepJobId = None
                self.run.runningTrainingStepStartTime = None
                self.run.save()
                didTrainingStepFinish = True
            elif job.ready():
                logging.info(f"Finished a training step for run {self.run.id}")
                self.run.runningTrainingStepJobId = None
                self.run.runningTrainingStepStartTime = None
                didTrainingStepFinish = True

                if job.successful():
                    resultObj = job.getResult()
                    if resultObj is None or resultObj.result is None:
                        errorMessage = f"A training step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}. The job did not produce a result object."
                        logging.error(errorMessage)
                        self.run.failedTrainingSteps += 1
                    elif resultObj.result['success']:

                        self.run.trainingIterationsCompleted += self.config['iterations_per_training_step']
                        self.run.trainingStepsCompleted += 1
                    else:
                        errorMessage = f"A training step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}."
                        if 'exception' in resultObj.result:
                            errorMessage += "\n\n" + resultObj.result['exception']

                        logging.error(errorMessage)

                        self.run.failedTrainingSteps += 1
                else:
                    errorMessage = f"A training step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}. The job did not produce a result object."
                    logging.error(errorMessage)
                    self.run.failedTrainingSteps += 1

                job.cleanup()
            elif timeElapsed > self.config['training_step_timeout']:
                logging.error(f"A training step appears to have timed out on testing run {self.run.id} with job name {job.kubeJobName()}")
                job.cleanup()
                self.run.runningTrainingStepJobId = None
                self.run.runningTrainingStepStartTime = None
                didTrainingStepFinish = True
                self.run.failedTrainingSteps += 1
            elif not job.ready() and job.getResult() is not None:
                resultObj = job.getResult()

                timePassed = abs((datetime.datetime.now() - resultObj.time).total_seconds())
                # Make sure at least 60 seconds has passed before we evaluate this result object.
                # This is to give the server enough time to shut down cleanly before we force
                # kill it as a timed out process.
                if timePassed > 60:
                    self.run.runningTrainingStepJobId = None
                    self.run.runningTrainingStepStartTime = None
                    didTrainingStepFinish = True

                    if resultObj.result is None or not resultObj.result['success']:
                        errorMessage = f"A training step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}. It also appears to have hung on exit and had to be forcibly shut down."
                        if resultObj.result is not None and 'exception' in resultObj.result:
                            errorMessage += "\n\n" + resultObj.result['exception']

                        logging.error(errorMessage)

                        self.run.failedTrainingSteps += 1
                    else:
                        warningMessage = f"A training step has succeeded for testing run {self.run.id} with job name {job.kubeJobName()}. But it also appears to have hung on exit and had to be forcibly shut down."
                        logging.warning(warningMessage)

                        self.run.trainingIterationsCompleted += self.config['iterations_per_training_step']
                        self.run.trainingStepsCompleted += 1

                    job.cleanup()

            self.run.save()

        return int(didTrainingStepFinish)

    def isTestingFailureConditionsMet(self):
        failedSessions = self.run.failedTestingSteps * self.config['web_session_parallel_execution_sessions']
        # The x2 here is purely an arbitrary cutoff point. If the system has failed more then twice what the entire testing
        # run was supposed to produce in successful steps, then the failure conditions are met.
        if failedSessions > (self.run.configuration.totalTestingSessions * 2):
            return True
        return False

    def isTrainingFailureConditionsMet(self):
        # This cutoff point is purely arbitrary. We set it at 5 just to ensure the amount of GPU time consumed doesn't get too crazy.
        if self.run.failedTrainingSteps > 5:
            return True
        return False

    @autoretry()
    def createBugsZipFile(self):
        bugs = list(BugModel.objects(owner=self.application.owner, testingRunId=self.run.id, isMuted=False))

        bugsZipFileOnDisk = open(os.path.join(self.config.getKwolaUserDataDirectory("bug_zip_files"), self.run.id + ".zip"), 'wb')
        bugsZip = zipfile.ZipFile(file=bugsZipFileOnDisk, mode='w')

        for bugIndex, bug in enumerate(bugs):
            bugRawVideoFilePath = f"bugs/{str(bug.id)}.mp4"
            bugAnnotatedVideoFilePath = f"bugs/{str(bug.id)}_bug_{str(bug.executionSessionId)}.mp4"

            bugsZip.writestr(f"bug_{bugIndex+1}.json", bytes(bug.to_json(), 'utf8'))

            try:
                bugRawVideoFile = storage.Blob(bugRawVideoFilePath, self.applicationStorageBucket)
                data = bugRawVideoFile.download_as_string()
                bugsZip.writestr(f"bug_{bugIndex+1}_raw.mp4", data)
            except google.cloud.exceptions.NotFound:
                logging.warning(f"Warning! Unable to find the bug video file {bugRawVideoFilePath} while attempting to assemble the final bug zip file.")

            try:
                bugAnnotatedVideoFile = storage.Blob(bugAnnotatedVideoFilePath, self.applicationStorageBucket)
                data = bugAnnotatedVideoFile.download_as_string()
                bugsZip.writestr(f"bug_{bugIndex+1}_annotated.mp4", data)
            except google.cloud.exceptions.NotFound:
                logging.warning(f"Warning! Unable to find the bug video file {bugAnnotatedVideoFilePath} while attempting to assemble the final bug zip file.")

        bugsZip.close()
        bugsZipFileOnDisk.close()

    def updateApplicationObjectForFinish(self):
        # Fetch application a second time down here, just in case any of the fields have changed
        self.application = ApplicationModel.objects(id=self.run.applicationId).limit(1).first()
        self.application.hasFirstTestingRunCompleted = True

        if not self.application.hasSentFeedbackRequestEmail:
            self.run.needsFeedbackRequestEmail = True
            self.application.hasSentFeedbackRequestEmail = True

        self.application.save()

    def updateTestingRunObjectForSuccessfulFinish(self):
        self.run.status = "completed"
        self.run.endTime = datetime.datetime.now()
        self.run.save()

    def updateTestingRunObjectForFailureFinish(self):
        self.run.status = "failed"
        self.run.endTime = datetime.datetime.now()
        self.run.save()

    def runTestingRunFinishedHooks(self):
        bugCount = BugModel.objects(owner=self.application.owner, testingRunId=self.run.id, isMuted=False).count()

        if self.application.enableEmailTestingRunCompletedNotifications:
            sendFinishTestingRunEmail(self.application, self.run, bugCount)

        if self.application.enableSlackTestingRunCompletedNotifications:
            postToCustomerSlack(f"A testing run has completed and found {bugCount} errors. View the results here: {self.cloudConfigData['frontend']['url']}app/dashboard/testing_runs/{self.run.id}", self.application)

        if self.application.testingRunFinishedWebhookURL:
            sendCustomerWebhook(self.application, "testingRunFinishedWebhookURL", json.loads(self.run.to_json()))

    def updateModelSymbols(self, config, testingStepIdsToProcess):
        # Load and save the agent to make sure all training subprocesses are synced
        agent = DeepLearningAgent(config=config, whichGpu=None)
        agent.initialize(enableTraining=False)
        agent.loadSymbolMap()

        totalNewSymbols = 0

        for testingStepId in testingStepIdsToProcess:
            testingStep = TestingStep.loadFromDisk(testingStepId, config)
            for executionSessionId in testingStep.executionSessions:
                executionSession = ExecutionSession.loadFromDisk(executionSessionId, config)

                traces = []
                for executionTraceId in executionSession.executionTraces:
                    traces.append(ExecutionTrace.loadFromDisk(executionTraceId, config, applicationId=testingStep.applicationId))

                totalNewSymbols += agent.assignNewSymbols(traces)

        logging.info(f"[{os.getpid()}] Added {totalNewSymbols} new symbols from the testing steps: {', '.join(testingStepIdsToProcess)}")

        agent.saveSymbolMap()

    def runTesting(self):
        self.loadTestingRun()

        # Special override here: if the application object has been marked as deleted, or is literally deleted and
        # missing from the database, then do not continue the testing run. Just finish quietly.
        if ApplicationModel.objects(Q(status__exists=False) | Q(status="active"), id=self.run.applicationId).count() == 0:
            return

        self.mountStorageDrive()
        self.updateApplicationObjectForStart()

        self.updateKwolaConfigJSONFile()
        self.doTestingRunInitializationIfNeeded()

        try:
            self.config = KwolaCoreConfiguration(self.configDir)
            logging.info(f"Testing Run starting with configuration: \n{pformat(self.config.configData)}")

            self.shouldExit = False

            while ((self.run.testingSessionsCompleted < self.run.configuration.totalTestingSessions
                    and not self.isTestingFailureConditionsMet())
                   or len(self.run.runningTestingStepJobIds) > 0) and not self.shouldExit:
                countFinished = self.reviewRunningTestingSteps()
                self.launchTestingStepsIfNeeded()

                countFinished += self.reviewRunningTrainingSteps()
                self.launchTrainingStepIfNeeded()

                self.updateModelSymbols(self.config, self.run.testingStepsNeedingSymbolProcessing)
                self.run.testingStepsNeedingSymbolProcessing = []

                # save on every step - just in case it was changed.
                self.run.save()

                # Chart generation has been disabled for now until further notice. This is because we are
                # having a lot of issues getting this working in the cloud environment. Its likely because
                # creating the charts is using too much CPU & RAM for the manager processes.
                # if countFinished > 0:
                #     generateAllCharts(self.config, applicationId=self.run.applicationId)

                time.sleep(60)

            self.reviewRunningTestingSteps()

            logging.info(f"Finished testing main sequence of the testing run {self.run.id}")

            if self.run.status == "running":
                self.createBugsZipFile()

                if not self.isTestingFailureConditionsMet():
                    self.updateApplicationObjectForFinish()
                    self.updateTestingRunObjectForSuccessfulFinish()
                    self.runTestingRunFinishedHooks()
                else:
                    self.updateTestingRunObjectForFailureFinish()
                    postToKwolaSlack(f"Warning! The testing run {self.run.id} has totally failed.")


            # Save after all the post-testing hooks are finished.
            self.run.save()

            self.updateModelSymbols(self.config, self.run.testingStepsNeedingSymbolProcessing)
            self.run.testingStepsNeedingSymbolProcessing = []

            generateAllCharts(self.config, applicationId=self.run.applicationId)

            self.run.save()

            while ((self.run.trainingIterationsCompleted < self.run.trainingIterationsNeeded
                    and not self.isTrainingFailureConditionsMet())
                   or self.run.runningTrainingStepJobId is not None) and not self.shouldExit:
                countFinished = self.reviewRunningTrainingSteps()
                self.launchTrainingStepIfNeeded()

                # save on every step - just in case it was changed.
                self.run.save()

                if countFinished > 0:
                    generateAllCharts(self.config, applicationId=self.run.applicationId)

                time.sleep(60)

            self.reviewRunningTrainingSteps()
            generateAllCharts(self.config, applicationId=self.run.applicationId)

            if self.isTrainingFailureConditionsMet():
                self.run.didTrainingFail = True
                self.run.save()

                postToKwolaSlack(f"Warning! Training totally failed on run {self.run.id}")
                

            logging.info(f"Finished training for run {self.run.id}.")

            # Do an extra save at the end here just for good measure
            self.run.save()

        except Exception:
            errorMessage = f"Error in the primary RunTesting job for the testing run with id {self.run.id}:\n\n{traceback.format_exc()}"
            logging.error(f"[{os.getpid()}] {errorMessage}")
            raise
        finally:
            unmountTestingRunStorageDrive(self.configDir)


