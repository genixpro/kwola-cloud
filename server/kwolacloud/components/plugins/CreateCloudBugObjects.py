from kwola.config.logger import getLogger
from kwolacloud.datamodels.MutedError import MutedError
from kwola.datamodels.BugModel import BugModel
from kwolacloud.datamodels.TestingRun import TestingRun
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.components.utils.debug_video import createDebugVideoSubProcess, addDebugActionCursorToImage
from kwola.components.plugins.base.TestingStepPluginBase import TestingStepPluginBase
from kwola.components.agents.DeepLearningAgent import DeepLearningAgent
from kwola.components.utils.retry import autoretry
import numpy
import skimage.io
import skimage.draw
import io
import copy
import tempfile
from kwolacloud.datamodels.id_utility import generateKwolaId
from datetime import datetime
import atexit
import concurrent.futures
import billiard as multiprocessing
import billiard.exceptions
import os
from kwola.components.utils.deunique import deuniqueString


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
        self.executionSessionTraces = {}


    def testingStepStarted(self, testingStep, executionSessions):
        self.allKnownErrorHashes[testingStep.id] = set()
        self.newErrorsThisTestingStep[testingStep.id] = []
        self.newErrorOriginalExecutionSessionIds[testingStep.id] = []
        self.newErrorOriginalStepNumbers[testingStep.id] = []

        self.loadKnownErrorHashes(testingStep)

        for session in executionSessions:
            self.executionSessionTraces[session.id] = []


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

            self.executionSessionTraces[executionSession.id].append(trace)

    def testingStepFinished(self, testingStep, executionSessions):
        existingBugs = self.loadAllBugs(testingStep)
        mutedErrors = self.loadAllMutedErrors(testingStep)
        priorTestingRunBugs = self.loadPriorTestingRunBugs(testingStep)

        bugObjects = []

        executionSessionsById = {}
        for session in executionSessions:
            executionSessionsById[session.id] = session

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
            bug.owner = testingStep.owner
            bug.applicationId = testingStep.applicationId
            bug.testingStepId = testingStep.id
            bug.executionSessionId = executionSessionId
            bug.creationDate = datetime.now()
            bug.stepNumber = stepNumber
            bug.error = copy.deepcopy(error)
            bug.testingRunId = testingStep.testingRunId
            bug.actionsPerformed = [
                trace.actionPerformed for trace in self.executionSessionTraces[executionSessionId]
            ][:(bug.stepNumber + 2)]
            bug.browser = executionSessionsById[executionSessionId].browser
            bug.userAgent = executionSessionsById[executionSessionId].userAgent
            bug.windowSize = executionSessionsById[executionSessionId].windowSize
            bug.recomputeCanonicalPageUrl()
            tracesForScore = [
                trace for trace in self.executionSessionTraces[executionSessionId][max(0, stepNumber-5):(stepNumber + 1)]
                if trace.codePrevalenceScore is not None
            ]

            if len(tracesForScore) > 0:
                bug.codePrevalenceScore = numpy.mean([trace.codePrevalenceScore for trace in tracesForScore])
            else:
                bug.codePrevalenceScore = None

            bug.isBugNew = True
            for priorBug in priorTestingRunBugs:
                if bug.isDuplicateOf(priorBug):
                    bug.isBugNew = False
                    break

            bug.recomputeBugQualitativeFeatures()

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
                bug.id = generateKwolaId(BugModel, testingStep.owner, self.config)
                videoData = self.config.loadKwolaFileData("videos", f'{str(bug.executionSessionId)}.mp4')
                self.config.saveKwolaFileData("bugs", bug.id + ".mp4", videoData)
                
                existingBugs.append(bug)
                bugObjects.append(bug)

                getLogger().info(f"\n\nBug #{len(bugObjects)}:\n{bug.generateBugText()}\n")

        getLogger().info(f"Found {len(self.newErrorsThisTestingStep[testingStep.id])} new unique errors this session.")

        testingStep.bugsFound = len(self.newErrorsThisTestingStep[testingStep.id])
        testingStep.errors = copy.deepcopy(self.newErrorsThisTestingStep[testingStep.id])

        self.generateVideoFilesForBugs(bugObjects)
        self.generateFrameSpriteSheetsForBugs(bugObjects)

        # Dedupe the bugs a second time. This is because the video generation can take quite a while,
        # and while it was running, other testing steps may have saved similar bugs. So we just do
        # second pass of filtering here to doubly ensure we do not save any duplicates to disk.
        # This still isn't perfect because technically two different testing steps could be running
        # this second deduping pass at the same time, but it is way less likely.
        existingBugs = self.loadAllBugs(testingStep)
        filteredBugObjects = []
        for bug in bugObjects:
            duplicate = False
            for existingBug in existingBugs:
                if bug.isDuplicateOf(existingBug):
                    duplicate = True
                    break
            if not duplicate:
                filteredBugObjects.append(bug)
        bugObjects = filteredBugObjects

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

        del self.executionSessionTraces[executionSession.id]


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

    def loadPriorTestingRunBugs(self, testingStep):
        priorTestingRun = TestingRun.objects(applicationId=testingStep.applicationId, status="completed").order_by("-startTime").first()

        if priorTestingRun is not None:
            bugs = BugModel.objects(testingRunId=priorTestingRun.id)
        else:
            bugs = []

        return list(bugs)

    @autoretry(exponentialBackOffBase=3)
    def generateVideoFilesForBugs(self, bugObjects):
        pool = multiprocessing.Pool(self.config['video_generation_processes'], maxtasksperchild=1)
        futures = []

        for bugIndex, bug in enumerate(bugObjects):
            future = pool.apply_async(func=createDebugVideoSubProcess, args=(
                self.config.serialize(), str(bug.executionSessionId), f"{bug.id}_bug", False, False, bug.stepNumber,
                bug.stepNumber + 3, "bugs"))
            futures.append((bugIndex, bug, future))

        for bugIndex, bug, future in futures:
            localFuture = future
            # for retry in range(5):
                # try:
            value = localFuture.get(timeout=self.config['debug_video_generation_timeout'])
            if value:
                getLogger().error(value)
            # break
            # except billiard.exceptions.WorkerLostError:
            #     if retry == 4:
            #         raise
            #     localFuture = pool.apply_async(func=createDebugVideoSubProcess, args=(
            #         self.config.serialize(), str(bug.executionSessionId), f"{bug.id}_bug", False, False, bug.stepNumber,
            #         bug.stepNumber + 3, "bugs"))
            # except BrokenPipeError:
            #     if retry == 4:
            #         raise
            #     localFuture = pool.apply_async(func=createDebugVideoSubProcess, args=(
            #         self.config.serialize(), str(bug.executionSessionId), f"{bug.id}_bug", False, False, bug.stepNumber,
            #         bug.stepNumber + 3, "bugs"))

        pool.close()
        pool.join()


    def generateFrameSpriteSheetsForBugs(self, bugObjects):
        cropWidth = 300
        cropHeight = 300

        for bug in bugObjects:
            rawImages = DeepLearningAgent.readVideoFrames(f"{str(bug.executionSessionId)}.mp4", self.config)

            sprite = numpy.ones([cropHeight * (bug.stepNumber + 3), cropWidth, 3], dtype=numpy.uint8) * 255

            errorFrame = None

            for imageIndex, image, action in zip(range(len(rawImages)), rawImages, bug.actionsPerformed):
                image *= 255

                if imageIndex < (bug.stepNumber + 3):
                    cropped = self.cropImageAroundAction(image, action, cropWidth, cropHeight)

                    if imageIndex == bug.stepNumber:
                        errorFrame = cropped

                    sprite[imageIndex * cropHeight : (imageIndex + 1) * cropHeight, 0:cropWidth, :] = cropped

            localTempDescriptor, localTemp = tempfile.mkstemp(suffix=".jpg")
            skimage.io.imsave(localTemp, sprite)
            with open(localTempDescriptor, 'rb') as f:
                data = f.read()
            os.unlink(localTemp)
            self.config.saveKwolaFileData("bug_frame_sprite_sheets", f"{bug.id}.jpg", data)


            localTempDescriptor, localTemp = tempfile.mkstemp(suffix=".jpg")
            skimage.io.imsave(localTemp, errorFrame)
            with open(localTempDescriptor, 'rb') as f:
                data = f.read()
            os.unlink(localTemp)
            self.config.saveKwolaFileData("bug_error_frames", f"{bug.id}.jpg", data)

    def cropImageAroundAction(self, image, action, cropWidth, cropHeight):
        left = int(action.x - cropWidth/2)
        top = int(action.y - cropHeight/2)

        if left < 0:
            left = 0
        if left >= (image.shape[1] - cropWidth):
            left = (image.shape[1] - cropWidth - 1)

        if top < 0:
            top = 0
        if top >= (image.shape[0] - cropHeight):
            top = (image.shape[0] - cropHeight - 1)

        right = left + cropWidth
        bottom = top + cropHeight

        cropped = numpy.copy(image[top:bottom, left:right])

        addDebugActionCursorToImage(cropped, [int(action.y - top), int(action.x - left)], action.type)

        return cropped
