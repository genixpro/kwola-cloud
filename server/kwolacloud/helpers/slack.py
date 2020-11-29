from slack_webhook import Slack
import logging
import requests
import json
from ..config.config import loadCloudConfiguration, getKwolaConfiguration

slackErrors = Slack(url='https://hooks.slack.com/services/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')
config = loadCloudConfiguration()

slackGeneral = Slack(url="https://hooks.slack.com/services/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")

def postToKwolaSlack(message, error=True):
    if config['features']['enableSlackLogging']:
        if error:
            slackErrors.post(text=message)
        else:
            slackGeneral.post(text=message)


class SlackLogHandler(logging.Handler):
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            message = f"[{config['name']}] {record.filename}:{record.lineno} {record.getMessage()}"
            slackErrors.post(text=message)


def postToCustomerSlack(message, application, attachmentText=None):
    if application.slackChannel is not None and application.slackAccessToken is not None:
        blocks = []

        if attachmentText is not None:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "plain_text",
                    "text": attachmentText
                }
            })

        data = {
            "channel": application.slackChannel,
            "text": message,
            "blocks": json.dumps(blocks)
        }

        headers = {
            "Authorization": f"Bearer {application.slackAccessToken}"
        }

        response = requests.post("https://slack.com/api/chat.postMessage", data, headers=headers)

        if response.status_code != 200:
            raise RuntimeError(f"Unable to post a message to slack. Request {json.dumps(data)} \n Response: {str(response.json())}")
        elif not response.json()['ok']:
            raise RuntimeError(f"Unable to post a message to slack. Request {json.dumps(data)} \n Response: {str(response.json())}")
