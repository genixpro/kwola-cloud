from slack_webhook import Slack
import logging
import requests
from ..config.config import loadConfiguration, getKwolaConfiguration

slack = Slack(url='https://hooks.slack.com/services/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')
config = loadConfiguration()

def postToKwolaSlack(message):
    if config['features']['enableSlackLogging']:
        slack.post(text=message)


class SlackLogHandler(logging.Handler):
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            message = f"[{config['name']}] {record.filename}:{record.lineno} {record.getMessage()}"
            slack.post(text=message)


def postToCustomerSlack(message, application):
    if application.slackChannel is not None and application.slackAccessToken is not None:
        data = {
            "channel": application.slackChannel,
            "text": message
        }

        headers = {
            "Authorization": f"Bearer {application.slackAccessToken}"
        }

        response = requests.post("https://slack.com/api/chat.postMessage", data, headers=headers)

        if response.status_code != 200:
            raise RuntimeError(f"Unable to post a message to slack: {str(response.json())}")
        elif not response.json()['ok']:
            raise RuntimeError(f"Unable to post a message to slack: {str(response.json())}")
