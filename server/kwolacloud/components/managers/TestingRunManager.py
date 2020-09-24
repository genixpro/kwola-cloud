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
from kwola.config.config import KwolaCoreConfiguration
from kwola.datamodels.BugModel import BugModel
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from kwola.components.utils.retry import autoretry
from kwolacloud.components.utils.KubernetesJob import KubernetesJob
from kwolacloud.helpers.slack import postToCustomerSlack
from kwolacloud.helpers.webhook import sendCustomerWebhook
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
        self.application.save()


    def updateKwolaConfigJSONFile(self):
        configFilePath = os.path.join(self.configDir, "kwola.json")

        runConfiguration = self.run.configuration

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
        kwolaConfigData['enableTypeEmail'] = runConfiguration.enableTypeEmail
        kwolaConfigData['enableTypePassword'] = runConfiguration.enableTypePassword
        kwolaConfigData['autologin'] = runConfiguration.autologin
        kwolaConfigData['prevent_offsite_links'] = runConfiguration.preventOffsiteLinks
        kwolaConfigData['testing_sequence_length'] = runConfiguration.testingSequenceLength
        kwolaConfigData['web_session_restrict_url_to_regexes'] = runConfiguration.urlWhitelistRegexes
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
            configFileBlob.upload_from_string(json.dumps(kwolaConfigData))

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
        if self.run.status != "running":
            if self.run.startTime is None:
                self.run.startTime = datetime.datetime.now()

            if self.run.predictedEndTime is None:
                self.run.predictedEndTime = self.run.startTime + relativedelta(hours=self.run.configuration.hours + 1, minute=30, second=0, microsecond=0)

            self.run.status = "running"

            if self.application.testingRunStartedWebhookURL:
                sendCustomerWebhook(self.application, "testingRunStartedWebhookURL", json.loads(self.run.to_json()))

            self.run.save()

            self.updateKwolaConfigJSONFile()
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
                            cpuRequest="3200m",
                            cpuLimit="5000m",
                            memoryRequest="9.0Gi",
                            memoryLimit="12.0Gi"
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

        destroyed = []
        toRemove = []
        toKill = []
        for jobId, startTime in zip(self.run.runningTestingStepJobIds, self.run.runningTestingStepStartTimes):
            timeElapsed = (datetime.datetime.now() - startTime).total_seconds()
            job = self.createTestingStepKubeJob(jobId)
            if not job.doesJobStillExist():
                logging.info("Job was unexpectedly destroyed. We can't find its object in the kubernetes cluster.")
                destroyed.append((jobId, job))
            elif job.ready():
                logging.info("Ready job has been found!")
                toRemove.append((jobId, job))
            elif timeElapsed > self.config['testing_step_timeout']:
                logging.error(f"A testing step appears to have timed out on testing run {self.run.id} with job name {job.kubeJobName()}")
                toKill.append((jobId, job))

        for (jobId, job) in destroyed:
            jobIndex = self.run.runningTestingStepJobIds.index(jobId)
            del self.run.runningTestingStepStartTimes[jobIndex]
            self.run.runningTestingStepJobIds.remove(jobId)

        for (jobId, job) in toRemove:
            jobIndex = self.run.runningTestingStepJobIds.index(jobId)
            del self.run.runningTestingStepStartTimes[jobIndex]
            self.run.runningTestingStepJobIds.remove(jobId)

            # We only count this testing step if it actually completed successfully, because
            # otherwise it needs to be done over again.
            if job.successful():
                result = job.getResult()
                if result is not None and result['success']:
                    logging.info(f"Finished a testing step for run {self.run.id} with name {job.kubeJobName()}")
                    job.cleanup()

                    self.run.trainingIterationsNeeded += trainingIterationsNeededPerSession * self.config['web_session_parallel_execution_sessions']
                    self.run.testingSessionsCompleted += result['successfulExecutionSessions']
                    self.run.testingSteps.append(result['testingStepId'])
                else:
                    logging.error(f"A testing step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}")

                    # Double check that the stripe subscription is still good. If the testing step failed because our
                    # stripe subscription is bad, we should just exit immediately.
                    if not verifyStripeSubscription(self.run):
                        self.shouldExit = True
                        break

        for (jobId, job) in toKill:
            jobIndex = self.run.runningTestingStepJobIds.index(jobId)
            del self.run.runningTestingStepStartTimes[jobIndex]
            self.run.runningTestingStepJobIds.remove(jobId)
            job.cleanup()

        self.run.save()

    def createTrainingStepKubeJob(self, referenceId):
        job = KubernetesJob(module="kwolacloud.tasks.SingleTrainingStepTask",
                                               data={
                                                   "testingRunId": self.run.id,
                                                   "trainingStepsCompleted": self.run.trainingStepsCompleted
                                               },
                                               referenceId=referenceId,
                                               image="worker",
                                               cpuRequest="6000m",
                                               cpuLimit=None,
                                               memoryRequest="14.0Gi",
                                               memoryLimit=None,
                                               gpu=True
                                               )
        return job


    def launchTrainingStepIfNeeded(self):
        if self.run.trainingIterationsCompleted < self.run.trainingIterationsNeeded and \
                self.run.runningTrainingStepJobId is None and \
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
        self.run.save()

    def reviewRunningTrainingSteps(self):
        if self.run.runningTrainingStepJobId is not None:
            job = self.createTrainingStepKubeJob(self.run.runningTrainingStepJobId)

            if not job.doesJobStillExist():
                logging.info(f"Job {job.kubeJobName()} was unexpectedly destroyed. We can't find its object in the kubernetes cluster.")
                self.run.runningTrainingStepJobId = None
                self.run.save()
            elif job.ready():
                logging.info(f"Finished a training step for run {self.run.id}")

                self.run.runningTrainingStepJobId = None
                self.run.trainingIterationsCompleted += self.config['iterations_per_training_step']
                self.run.trainingStepsCompleted += 1
                self.run.save()

                if job.successful():
                    result = job.getResult()
                    if result['success']:
                        job.cleanup()
                    else:
                        errorMessage = f"A training step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}."
                        if 'exception' in result:
                            errorMessage += "\n\n" + result['exception']

                        logging.error(errorMessage)
                else:
                    errorMessage = f"A training step appears to have failed on testing run {self.run.id} with job name {job.kubeJobName()}. The job did not produce a result object."
                    logging.error(errorMessage)

    def waitForTrainingJobCompletion(self):
        if self.run.runningTrainingStepJobId is not None:
            job = self.createTrainingStepKubeJob(self.run.runningTrainingStepJobId)
            job.wait()

    def waitForTestingJobCompletion(self):
        for jobId in self.run.runningTestingStepJobIds:
            job = self.createTestingStepKubeJob(jobId)
            job.wait()

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

    def updateTestingRunObjectForFinish(self):
        self.run.status = "completed"
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


    def runTesting(self):
        self.loadTestingRun()
        self.mountStorageDrive()
        self.updateApplicationObjectForStart()

        self.doTestingRunInitializationIfNeeded()

        try:
            self.config = KwolaCoreConfiguration(self.configDir)
            logging.info(f"Testing Run starting with configuration: \n{pformat(self.config.configData)}")

            self.shouldExit = False

            while self.run.testingSessionsCompleted < self.run.configuration.totalTestingSessions and not self.shouldExit:
                self.launchTestingStepsIfNeeded()
                self.reviewRunningTestingSteps()

                self.launchTrainingStepIfNeeded()
                self.reviewRunningTrainingSteps()

                # save on every step - just in case it was changed.
                self.run.save()

                time.sleep(60)

            self.waitForTestingJobCompletion()
            self.reviewRunningTestingSteps()

            logging.info(f"Finished testing main sequence of the testing run {self.run.id}")

            self.updateApplicationObjectForFinish()
            self.updateTestingRunObjectForFinish()
            self.createBugsZipFile()
            self.runTestingRunFinishedHooks()

            # Save after all the post-testing hooks are finished.
            self.run.save()

            while self.run.trainingIterationsCompleted < self.run.trainingIterationsNeeded and not self.shouldExit:
                self.launchTrainingStepIfNeeded()
                self.reviewRunningTrainingSteps()

                # save on every step - just in case it was changed.
                self.run.save()

                time.sleep(60)

            self.waitForTrainingJobCompletion()
            self.reviewRunningTrainingSteps()

            logging.info(f"Finished training for run {self.run.id}.")

            # Do an extra save at the end here just for good measure
            self.run.save()

        except Exception:
            errorMessage = f"Error in the primary RunTesting job for the testing run with id {self.run.id}:\n\n{traceback.format_exc()}"
            logging.error(f"[{os.getpid()}] {errorMessage}")
            raise
        finally:
            unmountTestingRunStorageDrive(self.configDir)


