#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadConfiguration
import stripe
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from ..helpers.slack import SlackLogHandler


def main():
        configData = loadConfiguration()

        if configData['features']['enableGoogleCloudLogging']:
            # Setup logging with google cloud
            client = google.cloud.logging.Client()
            client.get_default_handler()
            client.setup_logging()

            logger = getLogger()
            logger.handlers = logger.handlers[0:1]

        if configData['features']['enableSlackLogging']:
            logger = getLogger()
            logger.addHandler(SlackLogHandler())

        connectToMongoWithRetries()

        stripe.api_key = configData['stripe']['apiKey']

        runHourlyTasks()

