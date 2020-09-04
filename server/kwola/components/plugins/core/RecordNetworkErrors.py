from kwola.components.plugins.base.WebEnvironmentPluginBase import WebEnvironmentPluginBase
import selenium.common.exceptions
import os
from ....config.logger import getLogger
import re
from ....datamodels.errors.LogError import LogError
from .common import kwolaJSRewriteErrorDetectionStrings

class RecordNetworkErrors(WebEnvironmentPluginBase):
    def __init__(self):
        self.errorHashes = {}


    def browserSessionStarted(self, webDriver, proxy, executionSession):
        self.errorHashes[executionSession.id] = set()


    def beforeActionRuns(self, webDriver, proxy, executionSession, executionTrace, actionToExecute):
        proxy.resetNetworkErrors()


    def afterActionRuns(self, webDriver, proxy, executionSession, executionTrace, actionExecuted):
        for networkError in proxy.getNetworkErrors():
            networkError.page = executionTrace.startURL
            executionTrace.errorsDetected.append(networkError)
            errorHash = networkError.computeHash()

            if errorHash not in self.errorHashes[executionSession.id]:
                networkErrorMsgString = f"[{os.getpid()}] A network error was detected in client application:\n"
                networkErrorMsgString += f"Path: {networkError.path}\n"
                networkErrorMsgString += f"Status Code: {networkError.statusCode}\n"
                networkErrorMsgString += f"Message: {networkError.message}\n"

                getLogger().info(networkErrorMsgString)

                self.errorHashes[executionSession.id].add(errorHash)
                executionTrace.didNewErrorOccur = True

    def browserSessionFinished(self, webDriver, proxy, executionSession):
        pass



    def cleanup(self, webDriver, proxy, executionSession):
        pass
