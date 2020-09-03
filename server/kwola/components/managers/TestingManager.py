#
#     Kwola is an AI algorithm that learns how to use other programs
#     automatically so that it can find bugs in them.
#
#     Copyright (C) 2020 Kwola Software Testing Inc.
#
#     This program is free software: you can redistribute it and/or modify
#     it under the terms of the GNU Affero General Public License as
#     published by the Free Software Foundation, either version 3 of the
#     License, or (at your option) any later version.
#
#     This program is distributed in the hope that it will be useful,
#     but WITHOUT ANY WARRANTY; without even the implied warranty of
#     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#     GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with this program.  If not, see <https://www.gnu.org/licenses/>.
#


from ...config.logger import getLogger, setupLocalLogging
from ...components.agents.DeepLearningAgent import DeepLearningAgent
from ...components.environments.WebEnvironment import WebEnvironment
from ...tasks.TaskProcess import TaskProcess
from ...config.config import Configuration
from ...datamodels.ExecutionSessionModel import ExecutionSession
from ...datamodels.BugModel import BugModel
from ...datamodels.CustomIDField import CustomIDField
from ...datamodels.TestingStepModel import TestingStep
from ...tasks.RunTrainingStep import addExecutionSessionToSampleCache
from datetime import datetime
import atexit
import concurrent.futures
import billiard as multiprocessing
import numpy
import os
import pickle
import tempfile
import time
import traceback



class TestingManager:
    def __init__(self, configDir, testingStepId, shouldBeRandom=False, generateDebugVideo=False):
        getLogger().info(f"[{os.getpid()}] Starting New Testing Sequence")

        self.generateDebugVideo = generateDebugVideo
        self.shouldBeRandom = shouldBeRandom
        self.configDir = configDir
        self.config = Configuration(configDir)

        self.environment = None

        self.stepsRemaining = int(self.config['testing_sequence_length'])

        self.testStep = TestingStep.loadFromDisk(testingStepId, self.config)

        self.executionSessions = []
        self.executionSessionTraces = []

        self.allKnownErrorHashes = set()
        self.newErrorsThisTestingStep = []
        self.newErrorOriginalExecutionSessionIds = []
        self.newErrorOriginalStepNumbers = []

        self.step = 0

        self.listOfTimesForScreenshot = []
        self.listOfTimesForActionMapRetrieval = []
        self.listOfTimesForActionDecision = []
        self.listOfTimesForActionExecution = []
        self.listOfTimesForMiscellaneous = []
        self.listOfTotalLoopTimes = []

    def loadKnownErrorHashes(self):
        for bug in self.loadAllBugs():
            hash = bug.error.computeHash()
            self.allKnownErrorHashes.add(hash)

    def createExecutionSessions(self):
        self.executionSessions = [
            ExecutionSession(
                id=str(self.testStep.id) + "_session_" + str(sessionN),
                owner=self.testStep.owner,
                testingStepId=self.testStep.id,
                testingRunId=self.testStep.testingRunId,
                applicationId=self.testStep.applicationId,
                startTime=datetime.now(),
                endTime=None,
                tabNumber=sessionN,
                executionTraces=[]
            )
            for sessionN in range(self.environment.numberParallelSessions())
        ]

        self.executionSessionTraces = [[] for sessionN in range(self.environment.numberParallelSessions())]

        for session in self.executionSessions:
            session.saveToDisk(self.config)


    def createTestingSubprocesses(self):
        self.subProcesses = []

        for n in range(self.config['testing_subprocess_pool_size']):
            subProcessCommandQueue = multiprocessing.Queue()
            subProcessResultQueue = multiprocessing.Queue()
            subProcess = multiprocessing.Process(target=TestingManager.predictedActionSubProcess, args=(self.configDir, self.shouldBeRandom, subProcessCommandQueue, subProcessResultQueue))
            subProcess.start()
            atexit.register(lambda: subProcess.terminate())

            self.subProcesses.append((subProcessCommandQueue, subProcessResultQueue, subProcess))

    def restartOneTestingSubprocess(self):
        subProcessCommandQueue, subProcessResultQueue, subProcess = self.subProcesses.pop(0)

        subProcessCommandQueue.put("quit")
        subProcess.terminate()

        subProcessCommandQueue = multiprocessing.Queue()
        subProcessResultQueue = multiprocessing.Queue()
        subProcess = multiprocessing.Process(target=TestingManager.predictedActionSubProcess, args=(self.configDir, self.shouldBeRandom, subProcessCommandQueue, subProcessResultQueue))
        subProcess.start()
        atexit.register(lambda: subProcess.terminate())

        self.subProcesses.append((subProcessCommandQueue, subProcessResultQueue, subProcess))

    def killAndJoinTestingSubprocesses(self):
        for subProcessCommandQueue, subProcessResultQueue, subProcess in self.subProcesses:
            subProcessCommandQueue.put("quit")
            subProcess.join()

    def loadAllBugs(self):
        bugsDir = self.config.getKwolaUserDataDirectory("bugs")

        bugs = []

        for fileName in os.listdir(bugsDir):
            if ".lock" not in fileName and ".txt" not in fileName and ".mp4" not in fileName:
                bugId = fileName
                bugId = bugId.replace(".json", "")
                bugId = bugId.replace(".gz", "")
                bugId = bugId.replace(".pickle", "")

                bug = BugModel.loadFromDisk(bugId, self.config)

                if bug is not None:
                    bugs.append(bug)

        return bugs

    def loadAllMutedErrors(self):
        if self.config['data_serialization_method'] == 'mongo':
            from kwolacloud.datamodels.MutedError import MutedError
            mutedErrors = MutedError.objects(applicationId=self.testStep.applicationId)
            return list(mutedErrors)
        else:
            return []

    def removeBadSessions(self):
        sessionToRemove = self.environment.removeBadSessionIfNeeded()
        while sessionToRemove is not None:
            getLogger().warning(f"[{os.getpid()}] Removing web browser session at index {sessionToRemove} because the browser has crashed!")

            sessionId = self.executionSessions[sessionToRemove].id

            del self.executionSessions[sessionToRemove]
            del self.executionSessionTraces[sessionToRemove]

            n = 0
            while n < len(self.newErrorsThisTestingStep):
                if self.newErrorOriginalExecutionSessionIds[n] == sessionId:
                    del self.newErrorsThisTestingStep[n]
                    del self.newErrorOriginalStepNumbers[n]
                    del self.newErrorOriginalExecutionSessionIds[n]
                else:
                    n += 1

            sessionToRemove = self.environment.removeBadSessionIfNeeded()

    def logSessionRewards(self):
        totalRewards = []
        for session in self.executionSessions:
            getLogger().info(f"[{os.getpid()}] Session {session.tabNumber} finished with total reward: {session.totalReward:.3f}")
            totalRewards.append(session.totalReward)

        if len(totalRewards) > 0:
            getLogger().info(f"[{os.getpid()}] Mean total reward of all sessions: {numpy.mean(totalRewards):.3f}")

    def logActionTimeInfo(self):
        msg = f"[{os.getpid()}] Finished {self.step + 1} testing actions."
        if len(self.listOfTimesForScreenshot):
            msg += f"\n     Avg Screenshot time: {numpy.average(self.listOfTimesForScreenshot[-self.config['testing_print_every'] * len(self.executionSessions):])}"
            msg += f"\n     Avg Action Map Retrieval Time: {numpy.average(self.listOfTimesForActionMapRetrieval[-self.config['testing_print_every'] * len(self.executionSessions):])}"
            msg += f"\n     Avg Action Decision Time: {numpy.average(self.listOfTimesForActionDecision[-self.config['testing_print_every'] * len(self.executionSessions):])}"
            msg += f"\n     Avg Action Execution Time: {numpy.average(self.listOfTimesForActionExecution[-self.config['testing_print_every'] * len(self.executionSessions):])}"
            msg += f"\n     Avg Miscellaneous Time: {numpy.average(self.listOfTimesForMiscellaneous[-self.config['testing_print_every'] * len(self.executionSessions):])}"
            msg += f"\n     Avg Total Loop Time: {numpy.average(self.listOfTotalLoopTimes[-self.config['testing_print_every'] * len(self.executionSessions):])}"
        getLogger().info(msg)

    def executeSingleAction(self):
        taskStartTime = datetime.now()
        images = self.environment.getImages()
        screenshotTime = (datetime.now() - taskStartTime).total_seconds()

        taskStartTime = datetime.now()
        envActionMaps = self.environment.getActionMaps()
        actionMapRetrievalTime = (datetime.now() - taskStartTime).total_seconds()

        fileDescriptor, inferenceBatchFileName = tempfile.mkstemp()

        with open(fileDescriptor, 'wb') as file:
            pickle.dump((self.step, images, envActionMaps, self.executionSessionTraces), file)

        del images, envActionMaps

        subProcessCommandQueue, subProcessResultQueue, subProcess = self.subProcesses[0]

        taskStartTime = datetime.now()
        subProcessCommandQueue.put(inferenceBatchFileName)
        resultFileName = subProcessResultQueue.get()
        actionDecisionTime = (datetime.now() - taskStartTime).total_seconds()
        with open(resultFileName, 'rb') as file:
            actions = pickle.load(file)
        os.unlink(resultFileName)

        if self.stepsRemaining % self.config['testing_print_every'] == 0:
            self.logActionTimeInfo()

        taskStartTime = datetime.now()
        traces = self.environment.runActions(actions, [executionSession.id for executionSession in self.executionSessions])
        actionExecutionTime = (datetime.now() - taskStartTime).total_seconds()

        totalLoopTime = (datetime.now() - self.loopTime).total_seconds()
        self.loopTime = datetime.now()

        miscellaneousTime = totalLoopTime - (screenshotTime + actionMapRetrievalTime + actionDecisionTime + actionExecutionTime)

        self.listOfTimesForScreenshot.append(screenshotTime)
        self.listOfTimesForActionMapRetrieval.append(actionMapRetrievalTime)
        self.listOfTimesForActionDecision.append(actionDecisionTime)
        self.listOfTimesForActionExecution.append(actionExecutionTime)
        self.listOfTimesForMiscellaneous.append(miscellaneousTime)
        self.listOfTotalLoopTimes.append(totalLoopTime)

        for sessionN, executionSession, trace in zip(range(len(traces)), self.executionSessions, traces):
            if trace is None:
                continue

            trace.executionSessionId = str(executionSession.id)
            trace.testingStepId = str(self.testStep.id)
            trace.applicationId = str(executionSession.applicationId)
            trace.testingRunId = str(executionSession.testingRunId)
            trace.owner = self.testStep.owner

            trace.timeForScreenshot = screenshotTime
            trace.timeForActionMapRetrieval = actionMapRetrievalTime
            trace.timeForActionDecision = actionDecisionTime
            trace.timeForActionExecution = actionExecutionTime
            trace.timeForMiscellaneous = miscellaneousTime
            trace.saveToDisk(self.config)

            self.executionSessions[sessionN].executionTraces.append(str(trace.id))
            self.executionSessionTraces[sessionN].append(trace)
            self.executionSessions[sessionN].totalReward = float(numpy.sum(DeepLearningAgent.computePresentRewards(self.executionSessionTraces[sessionN], self.config)))

            for error in trace.errorsDetected:
                hash = error.computeHash()

                if hash not in self.allKnownErrorHashes:
                    self.allKnownErrorHashes.add(hash)
                    self.newErrorsThisTestingStep.append(error)
                    self.newErrorOriginalExecutionSessionIds.append(str(executionSession.id))
                    self.newErrorOriginalStepNumbers.append(self.step)

        del traces

    def generatePlainVideoFiles(self):
        getLogger().info(f"[{os.getpid()}] Creating movies for the execution sessions of this testing sequence.")
        videoPaths = self.environment.createMovies()

        kwolaVideoDirectory = self.config.getKwolaUserDataDirectory("videos")

        for executionSession, sessionN, videoPath in zip(self.executionSessions, range(len(videoPaths)), videoPaths):
            with open(videoPath, 'rb') as origFile:
                with open(os.path.join(kwolaVideoDirectory, f'{str(executionSession.id)}.mp4'), "wb") as cloneFile:
                    cloneFile.write(origFile.read())

    def createAndSaveBugObjects(self):
        kwolaVideoDirectory = self.config.getKwolaUserDataDirectory("videos")

        existingBugs = self.loadAllBugs()
        mutedErrors = self.loadAllMutedErrors()

        bugObjects = []

        for errorIndex, error, executionSessionId, stepNumber in zip(range(len(self.newErrorsThisTestingStep)),
                                                                     self.newErrorsThisTestingStep,
                                                                     self.newErrorOriginalExecutionSessionIds,
                                                                     self.newErrorOriginalStepNumbers):
            bug = BugModel()
            bug.id = CustomIDField.generateNewUUID(BugModel, self.config)
            bug.owner = self.testStep.owner
            bug.applicationId = self.testStep.applicationId
            bug.testingStepId = self.testStep.id
            bug.executionSessionId = executionSessionId
            bug.creationDate = datetime.now()
            bug.stepNumber = stepNumber
            bug.error = error
            bug.testingRunId = self.testStep.testingRunId

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
                bug.saveToDisk(self.config, overrideSaveFormat="json", overrideCompression=0)
                bug.saveToDisk(self.config)

                bugTextFile = os.path.join(self.config.getKwolaUserDataDirectory("bugs"), bug.id + ".txt")
                with open(bugTextFile, "wb") as file:
                    file.write(bytes(bug.generateBugText(), "utf8"))

                bugVideoFilePath = os.path.join(self.config.getKwolaUserDataDirectory("bugs"), bug.id + ".mp4")
                with open(os.path.join(kwolaVideoDirectory, f'{str(executionSessionId)}.mp4'), "rb") as origFile:
                    with open(bugVideoFilePath, 'wb') as cloneFile:
                        cloneFile.write(origFile.read())

                getLogger().info(f"\n\n[{os.getpid()}] Bug #{errorIndex + 1}:\n{bug.generateBugText()}\n")

                existingBugs.append(bug)
                bugObjects.append(bug)

                getLogger().info(f"\n\n[{os.getpid()}] Bug #{errorIndex + 1}:\n{bug.generateBugText()}\n")
        return bugObjects


    def generateAnnotatedVideos(self, bugObjects):
        debugVideoSubprocesses = []

        for session in self.executionSessions:
            debugVideoSubprocess = multiprocessing.Process(target=TestingManager.createDebugVideoSubProcess, args=(self.configDir, str(session.id), "", False, False, None, None, "annotated_videos"))
            atexit.register(lambda: debugVideoSubprocess.terminate() if debugVideoSubprocess is not None else None)
            debugVideoSubprocesses.append(debugVideoSubprocess)

        getLogger().info(f"[{os.getpid()}] Found {len(self.newErrorsThisTestingStep)} new unique errors this session.")

        for bugIndex, bug in enumerate(bugObjects):
            debugVideoSubprocess = multiprocessing.Process(target=TestingManager.createDebugVideoSubProcess, args=(
                self.configDir, str(bug.executionSessionId), f"{bug.id}_bug", False, False, bug.stepNumber, bug.stepNumber + 3, "bugs"))
            atexit.register(lambda: debugVideoSubprocess.terminate())
            debugVideoSubprocesses.append(debugVideoSubprocess)

        if not self.shouldBeRandom and self.generateDebugVideo:
            # Start some parallel processes generating debug videos.
            debugVideoSubprocess1 = multiprocessing.Process(target=TestingManager.createDebugVideoSubProcess, args=(
            self.configDir, str(self.executionSessions[0].id), "prediction", True, True, None, None, "debug_videos"))
            atexit.register(lambda: debugVideoSubprocess1.terminate())
            debugVideoSubprocesses.append(debugVideoSubprocess1)

            # Leave a gap between the two to reduce collision
            time.sleep(5)

            debugVideoSubprocess2 = multiprocessing.Process(target=TestingManager.createDebugVideoSubProcess, args=(
            self.configDir, str(self.executionSessions[int(len(self.executionSessions) / 3)].id), "mix", True, True, None, None, "debug_videos"))
            atexit.register(lambda: debugVideoSubprocess2.terminate())
            debugVideoSubprocesses.append(debugVideoSubprocess2)

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.config['video_generation_processes']) as executor:
            futures = []
            for debugVideoSubprocess in debugVideoSubprocesses:
                futures.append(executor.submit(TestingManager.runAndJoinSubprocess, debugVideoSubprocess))
            for future in futures:
                future.result()

    def shutdownEnvironment(self):
        self.environment.shutdown()
        del self.environment


    def addSessionsToSampleCache(self):
        with concurrent.futures.ProcessPoolExecutor(max_workers=2) as executor:
            futures = []
            for session in self.executionSessions:
                getLogger().info(f"[{os.getpid()}] Preparing samples for {session.id} and adding them to the sample cache.")
                futures.append(executor.submit(addExecutionSessionToSampleCache, session.id, self.config))
            for future in futures:
                future.result()

    @staticmethod
    def predictedActionSubProcess(configDir, shouldBeRandom, subProcessCommandQueue, subProcessResultQueue):
        setupLocalLogging()

        config = Configuration(configDir)

        agent = DeepLearningAgent(config, whichGpu=None)

        agent.initialize(enableTraining=False)
        agent.load()

        while True:
            message = subProcessCommandQueue.get()

            if message == "quit":
                break
            else:
                inferenceBatchFileName = message

            with open(inferenceBatchFileName, 'rb') as file:
                step, images, envActionMaps, pastExecutionTraces = pickle.load(file)

            os.unlink(inferenceBatchFileName)

            actions = agent.nextBestActions(step, images, envActionMaps, pastExecutionTraces, shouldBeRandom=shouldBeRandom)

            resultFileDescriptor, resultFileName = tempfile.mkstemp()
            with open(resultFileDescriptor, 'wb') as file:
                pickle.dump(actions, file)

            subProcessResultQueue.put(resultFileName)

    @staticmethod
    def createDebugVideoSubProcess(configDir, executionSessionId, name="", includeNeuralNetworkCharts=True, includeNetPresentRewardChart=True, hilightStepNumber=None, cutoffStepNumber=None, folder="debug_videos"):
        setupLocalLogging()

        getLogger().info(f"Creating debug video for session {executionSessionId} with options includeNeuralNetworkCharts={includeNeuralNetworkCharts}, includeNetPresentRewardChart={includeNetPresentRewardChart}, hilightStepNumber={hilightStepNumber}, cutoffStepNumber={cutoffStepNumber}")

        config = Configuration(configDir)

        agent = DeepLearningAgent(config, whichGpu=None)
        agent.initialize(enableTraining=False)
        agent.load()

        kwolaDebugVideoDirectory = config.getKwolaUserDataDirectory(folder)

        executionSession = ExecutionSession.loadFromDisk(executionSessionId, config)

        videoData = agent.createDebugVideoForExecutionSession(executionSession, includeNeuralNetworkCharts=includeNeuralNetworkCharts, includeNetPresentRewardChart=includeNetPresentRewardChart, hilightStepNumber=hilightStepNumber, cutoffStepNumber=cutoffStepNumber)
        with open(os.path.join(kwolaDebugVideoDirectory, f'{name + "_" if name else ""}{str(executionSession.id)}.mp4'), "wb") as cloneFile:
            cloneFile.write(videoData)

        del agent

    @staticmethod
    def runAndJoinSubprocess(debugVideoSubprocess):
        debugVideoSubprocess.start()
        debugVideoSubprocess.join()

    def runTesting(self):
        getLogger().info(f"[{os.getpid()}] Starting New Testing Sequence")

        resultValue = {'success': True}

        try:
            try:
                multiprocessing.set_start_method('spawn')
            except RuntimeError:
                pass

            self.environment = WebEnvironment(config=self.config)

            self.testStep.startTime = datetime.now()
            self.testStep.status = "running"
            self.testStep.saveToDisk(self.config)

            self.createExecutionSessions()
            self.loadKnownErrorHashes()
            self.createTestingSubprocesses()

            self.loopTime = datetime.now()
            while self.stepsRemaining > 0:
                self.stepsRemaining -= 1

                self.removeBadSessions()
                if len(self.executionSessions) == 0:
                    break

                self.executeSingleAction()

                if self.config['testing_reset_agent_period'] == 1 or self.stepsRemaining % self.config['testing_reset_agent_period'] == (self.config['testing_reset_agent_period'] - 1):
                    self.restartOneTestingSubprocess()

                self.step += 1

            self.killAndJoinTestingSubprocesses()
            self.removeBadSessions()
            self.generatePlainVideoFiles()

            self.logSessionRewards()

            for session in self.executionSessions:
                session.saveToDisk(self.config)

            self.testStep.bugsFound = len(self.newErrorsThisTestingStep)
            self.testStep.errors = self.newErrorsThisTestingStep

            bugs = self.createAndSaveBugObjects()

            # Do this here before generating the annotated bug videos in order
            # to conserve memory
            self.shutdownEnvironment()
            self.generateAnnotatedVideos(bugs)

            self.testStep.status = "completed"
            self.testStep.endTime = datetime.now()
            self.testStep.executionSessions = [session.id for session in self.executionSessions]
            self.testStep.saveToDisk(self.config)
            resultValue['successfulExecutionSessions'] = len(self.testStep.executionSessions)
            resultValue['success'] = True

        except Exception as e:
            getLogger().error(f"[{os.getpid()}] Unhandled exception occurred during testing sequence:\n{traceback.format_exc()}")
            resultValue['success'] = False
            resultValue['exception'] = traceback.format_exc()

        # This print statement will trigger the parent manager process to kill this process.
        getLogger().info(f"[{os.getpid()}] Finished Running Testing Sequence!")

        return resultValue
