from kwola.config.logger import getLogger
from kwolacloud.datamodels.MutedError import MutedError
from kwola.datamodels.BugModel import BugModel
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.components.utils.debug_video import createDebugVideoSubProcess
from kwola.components.plugins.base.TestingStepPluginBase import TestingStepPluginBase
from kwolacloud.datamodels.id_utility import generateKwolaId
from datetime import datetime
import atexit
import concurrent.futures
import multiprocessing
import os


class CreateCloudBugObjects(TestingStepPluginBase):
    """
        This plugin creates bug objects for the bugs created in kwola cloud,
    """
    def __init__(self, config):
        self.config = config

        self.allKnownErrorHashes = {}
        self.newErrorsThisTestingStep = {}
        self.newErrorOriginalExecutionSessionIds = {}
        self.newErrorOriginalStepNumbers = {}


    def testingStepStarted(self, testingStep, executionSessions):
        self.allKnownErrorHashes[testingStep.id] = set()
        self.newErrorsThisTestingStep[testingStep.id] = []
        self.newErrorOriginalExecutionSessionIds[testingStep.id] = []
        self.newErrorOriginalStepNumbers[testingStep.id] = []

        self.loadKnownErrorHashes(testingStep)


    def beforeActionsRun(self, testingStep, executionSessions, actions):
        pass


    def afterActionsRun(self, testingStep, executionSessions, traces):
        for sessionN, executionSession, trace in zip(range(len(traces)), executionSessions, traces):
            if trace is None:
                continue

            for error in trace.errorsDetected:
                hash = error.computeHash()

                if hash not in self.allKnownErrorHashes:
                    self.allKnownErrorHashes[testingStep.id].add(hash)
                    self.newErrorsThisTestingStep[testingStep.id].append(error)
                    self.newErrorOriginalExecutionSessionIds[testingStep.id].append(str(executionSession.id))
                    self.newErrorOriginalStepNumbers[testingStep.id].append(trace.traceNumber)

    def testingStepFinished(self, testingStep, executionSessions):
        kwolaVideoDirectory = self.config.getKwolaUserDataDirectory("videos")

        existingBugs = self.loadAllBugs(testingStep)
        mutedErrors = self.loadAllMutedErrors(testingStep)

        bugObjects = []

        for errorIndex, error, executionSessionId, stepNumber in zip(range(len(self.newErrorsThisTestingStep[testingStep.id])),
                                                                     self.newErrorsThisTestingStep[testingStep.id],
                                                                     self.newErrorOriginalExecutionSessionIds[testingStep.id],
                                                                     self.newErrorOriginalStepNumbers[testingStep.id]):
            if error.type == "http":
                if error.statusCode == 400 and not self.config['enable_400_error']:
                    continue # Skip this error
                if error.statusCode == 401 and not self.config['enable_401_error']:
                    continue # Skip this error
                if error.statusCode == 403 and not self.config['enable_403_error']:
                    continue # Skip this error
                if error.statusCode == 404 and not self.config['enable_404_error']:
                    continue # Skip this error
                if error.statusCode >= 500 and not self.config['enable_5xx_error']:
                    continue # Skip this error
            elif error.type == "log":
                if not self.config['enable_javascript_console_error']:
                    continue # Skip this error
            elif error.type == "exception":
                if not self.config['enable_unhandled_exception_error']:
                    continue # Skip this error

            bug = BugModel()
            bug.id = generateKwolaId(BugModel, testingStep.owner, self.config)
            bug.owner = testingStep.owner
            bug.applicationId = testingStep.applicationId
            bug.testingStepId = testingStep.id
            bug.executionSessionId = executionSessionId
            bug.creationDate = datetime.now()
            bug.stepNumber = stepNumber
            bug.error = error
            bug.testingRunId = testingStep.testingRunId

            duplicate = False
            for existingBug in existingBugs:
                if bug.isDuplicateOf(existingBug):
                    duplicate = True
                    break

            for mutedError in mutedErrors:
                if bug.isDuplicateOf(mutedError):
                    bug.isMuted = True
                    bug.mutedErrorId = mutedError.id
                    mutedError.totalOccurrences += 1
                    mutedError.mostRecentOccurrence = datetime.now()
                    mutedError.saveToDisk(self.config)

            if not duplicate:
                bugVideoFilePath = os.path.join(self.config.getKwolaUserDataDirectory("bugs"), bug.id + ".mp4")
                with open(os.path.join(kwolaVideoDirectory, f'{str(executionSessionId)}.mp4'), "rb") as origFile:
                    with open(bugVideoFilePath, 'wb') as cloneFile:
                        cloneFile.write(origFile.read())

                getLogger().info(f"\n\n[{os.getpid()}] Bug #{errorIndex + 1}:\n{bug.generateBugText()}\n")

                existingBugs.append(bug)
                bugObjects.append(bug)

                getLogger().info(f"\n\n[{os.getpid()}] Bug #{errorIndex + 1}:\n{bug.generateBugText()}\n")

        getLogger().info(f"[{os.getpid()}] Found {len(self.newErrorsThisTestingStep[testingStep.id])} new unique errors this session.")

        testingStep.bugsFound = len(self.newErrorsThisTestingStep[testingStep.id])
        testingStep.errors = self.newErrorsThisTestingStep[testingStep.id]

        self.generateVideoFilesForBugs(testingStep, bugObjects)
        # We save the bug objects after generating the video files
        # Just to ensure that any bugs which get shown on the frontend
        # actually had their associated video files and don't cause
        # errors. This is because occasionally this process can get
        # killed while its working on generating the videos, and we
        # thus don't want to leave a bunch of bug objects in the db
        # without their associated video objects.
        for bug in bugObjects:
            bug.save()

    def sessionFailed(self, testingStep, executionSession):
        n = 0
        while n < len(self.newErrorsThisTestingStep[testingStep.id]):
            if self.newErrorOriginalExecutionSessionIds[testingStep.id][n] == executionSession.id:
                del self.newErrorsThisTestingStep[testingStep.id][n]
                del self.newErrorOriginalStepNumbers[testingStep.id][n]
                del self.newErrorOriginalExecutionSessionIds[testingStep.id][n]
            else:
                n += 1


    def loadKnownErrorHashes(self, testingStep):
        for bug in self.loadAllBugs(testingStep):
            hash = bug.error.computeHash()
            self.allKnownErrorHashes[testingStep.id].add(hash)

    def loadAllBugs(self, testingStep):
        bugs = BugModel.objects(testingRunId=testingStep.testingRunId)

        return list(bugs)

    def loadAllMutedErrors(self, testingStep):
        mutedErrors = MutedError.objects(applicationId=testingStep.applicationId)
        return list(mutedErrors)

    def generateVideoFilesForBugs(self, testingStep, bugObjects):
        debugVideoSubprocesses = []

        for bugIndex, bug in enumerate(bugObjects):
            debugVideoSubprocess = multiprocessing.Process(target=createDebugVideoSubProcess, args=(
                self.config.configurationDirectory, str(bug.executionSessionId), f"{bug.id}_bug", False, False, bug.stepNumber,
                bug.stepNumber + 3, "bugs"))
            atexit.register(lambda: debugVideoSubprocess.terminate())
            debugVideoSubprocesses.append(debugVideoSubprocess)

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.config['video_generation_processes']) as executor:
            futures = []
            for debugVideoSubprocess in debugVideoSubprocesses:
                futures.append(executor.submit(CreateCloudBugObjects.runAndJoinSubprocess, debugVideoSubprocess))
            for future in futures:
                future.result()

    @staticmethod
    def runAndJoinSubprocess(debugVideoSubprocess):
        debugVideoSubprocess.start()
        debugVideoSubprocess.join()

