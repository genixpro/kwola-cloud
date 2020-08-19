from slack_webhook import Slack

slack = Slack(url='https://hooks.slack.com/services/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')

def postToKwolaSlack(message):
    slack.post(text=message)