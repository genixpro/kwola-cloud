from kwola.components.plugins.base.WebEnvironmentPluginBase import WebEnvironmentPluginBase
import selenium.common.exceptions
import os
from kwola.config.logger import getLogger
import re
from kwola.datamodels.errors.LogError import LogError
from .common import kwolaJSRewriteErrorDetectionStrings

class RecordLogEntriesAndLogErrors(WebEnvironmentPluginBase):
    networkErrorRegex = re.compile(r"(\D[45]\d\d$)|(\D[45]\d\d\D)")

    def __init__(self, config):
        self.errorHashes = {}
        self.startLogCounts = {}
        self.config = config


    def browserSessionStarted(self, webDriver, proxy, executionSession):
        self.errorHashes[executionSession.id] = set()


    def beforeActionRuns(self, webDriver, proxy, executionSession, executionTrace, actionToExecute):
        startLogCount = len(webDriver.get_log('browser'))

        self.startLogCounts[executionSession.id] = startLogCount


    def afterActionRuns(self, webDriver, proxy, executionSession, executionTrace, actionExecuted):
        logEntries = webDriver.get_log('browser')[self.startLogCounts[executionSession.id]:]
        for log in logEntries:
            if log['level'] == 'SEVERE':
                message = str(log['message'])
                message = message.replace("\\n", "\n")

                # If it looks like a network error, then ignore it because those are handled separately
                if RecordLogEntriesAndLogErrors.networkErrorRegex.search(message) is not None:
                    continue

                kwolaJSRewriteErrorFound = False
                for detectionString in kwolaJSRewriteErrorDetectionStrings:
                    if detectionString in message:
                        kwolaJSRewriteErrorFound = True
                        break

                ignoreErrorKeywordFound = False
                matchingIgnoreKeyword = None
                for ignoreKeyword in self.config['web_session_ignored_log_error_keywords']:
                    if ignoreKeyword in message:
                        ignoreErrorKeywordFound = True
                        matchingIgnoreKeyword = ignoreKeyword
                        break

                if kwolaJSRewriteErrorFound:
                    logMsgString = f"[{os.getpid()}] Error. There was a bug generated by the underlying javascript application, " \
                                   f"but it appears to be a bug in Kwola's JS rewriting. Please notify the Kwola " \
                                   f"developers that this url: {webDriver.current_url} gave you a js-code-rewriting " \
                                   f"issue.\n"

                    logMsgString += f"{message}\n"

                    getLogger().error(logMsgString)
                elif ignoreErrorKeywordFound:
                    logMsgString = f"[{os.getpid()}] Suppressed an error message because it matched the " \
                                   f"error ignore keyword {matchingIgnoreKeyword}. "

                    logMsgString += f"{message}\n"

                    getLogger().info(logMsgString)
                else:
                    error = LogError(type="log", page=executionTrace.startURL, message=message, logLevel=log['level'])
                    executionTrace.errorsDetected.append(error)
                    errorHash = error.computeHash()

                    executionTrace.didErrorOccur = True

                    if errorHash not in self.errorHashes[executionSession.id]:
                        logMsgString = f"[{os.getpid()}] A log error was detected in client application:\n"
                        logMsgString += f"{message}\n"

                        getLogger().info(logMsgString)

                        self.errorHashes[executionSession.id].add(errorHash)
                        executionTrace.didNewErrorOccur = True

        executionTrace.logOutput = "\n".join([str(log) for log in logEntries])
        executionTrace.hadLogOutput = bool(executionTrace.logOutput)

    def browserSessionFinished(self, webDriver, proxy, executionSession):
        pass



    def cleanup(self, webDriver, proxy, executionSession):
        pass