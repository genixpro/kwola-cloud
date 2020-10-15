from kwola.config.logger import getLogger, setupLocalLogging
from ...managers.TrainingManager import TrainingManager
from ..base.TestingStepPluginBase import TestingStepPluginBase
import concurrent.futures
import os
from ...utils.retry import autoretry



class PrecomputeSessionsForSampleCache(TestingStepPluginBase):
    """
        This plugin creates bug objects for all of the errors discovered during this testing step
    """
    def __init__(self, config):
        self.config = config

    def testingStepStarted(self, testingStep, executionSessions):
        pass

    def beforeActionsRun(self, testingStep, executionSessions, actions):
        pass

    def afterActionsRun(self, testingStep, executionSessions, traces):
        pass

    @staticmethod
    def addExecutionSessionToSampleCache(id, config):
        setupLocalLogging()
        return TrainingManager.addExecutionSessionToSampleCache(id, config)

    @autoretry()
    def testingStepFinished(self, testingStep, executionSessions):
        for session in executionSessions:
            getLogger().info(f"[{os.getpid()}] Preparing samples for {session.id} and adding them to the sample cache.")
            TrainingManager.addExecutionSessionToSampleCache(session.id, self.config)

        # For some reason, we are getting frequent errors with the multi-process based version of this code shown below
        # with concurrent.futures.ProcessPoolExecutor(max_workers=2) as executor:
        #     futures = []
        #     for session in executionSessions:
        #         getLogger().info(f"[{os.getpid()}] Preparing samples for {session.id} and adding them to the sample cache.")
        #         futures.append(executor.submit(PrecomputeSessionsForSampleCache.addExecutionSessionToSampleCache, session.id, self.config))
        #     for future in futures:
        #         future.result()

    def sessionFailed(self, testingStep, executionSession):
        pass
