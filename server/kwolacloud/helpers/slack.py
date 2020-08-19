from slack_webhook import Slack
import logging
from ..config.config import loadConfiguration, getKwolaConfiguration

slack = Slack(url='https://hooks.slack.com/services/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')
config = loadConfiguration()

def postToKwolaSlack(message):
    slack.post(text=message)


class SlackLogHandler(logging.Handler):
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            message = f"[{config['name']}] {record.filename}:{record.lineno} {record.getMessage()}"
            slack.post(text=message)

