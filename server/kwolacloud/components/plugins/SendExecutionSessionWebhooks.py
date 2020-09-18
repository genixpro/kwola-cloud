from kwola.components.plugins.base.WebEnvironmentPluginBase import WebEnvironmentPluginBase
from kwolacloud.helpers.webhook import sendCustomerWebhook
import json


class SendExecutionSessionWebhooks(WebEnvironmentPluginBase):
    """
        This plugin creates bug objects for all of the errors discovered during this testing step
    """
    def __init__(self, config, application):
        self.config = config
        self.application = application


    def browserSessionStarted(self, webDriver, proxy, executionSession):
        if self.application.browserSessionWillStartWebhookURL:
            success = sendCustomerWebhook(self.application, "browserSessionWillStartWebhookURL", json.loads(executionSession.to_json()))


    def beforeActionRuns(self, webDriver, proxy, executionSession, executionTrace, actionToExecute):
        pass


    def afterActionRuns(self, webDriver, proxy, executionSession, executionTrace, actionExecuted):
        pass


    def browserSessionFinished(self, webDriver, proxy, executionSession):
        if self.application.browserSessionFinishedWebhookURL:
            success = sendCustomerWebhook(self.application, "browserSessionFinishedWebhookURL", json.loads(executionSession.to_json()))

    def cleanup(self, webDriver, proxy, executionSession):
        pass
