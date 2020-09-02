#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google.cloud.logging
from ..config.config import loadConfiguration
import stripe
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks


def main():
        configData = loadConfiguration()

        # Setup logging with google cloud
        client = google.cloud.logging.Client()
        client.get_default_handler()
        client.setup_logging()

        logger = getLogger()
        logger.handlers = logger.handlers[0:1]

        connectToMongoWithRetries()

        stripe.api_key = configData['stripe']['apiKey']

        runHourlyTasks()

