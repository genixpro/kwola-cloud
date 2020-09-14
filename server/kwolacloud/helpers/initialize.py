from ..config.config import loadConfiguration
from ..db import connectToMongoWithRetries
from ..helpers.slack import SlackLogHandler
from kwola.config.logger import getLogger
from kwola.config.logger import getLogger, setupLocalLogging, kwolaLoggingFormatString, kwolaDateFormatString
import google
import google.cloud
import google.cloud.logging
import logging
import multiprocessing
import os
import stripe


def initializeKwolaCloudProcess(localLogging=False):
    try:
        multiprocessing.set_start_method('spawn')
    except RuntimeError:
        pass

    configData = loadConfiguration()

    if configData['features']['enableGoogleCloudLogging'] and not localLogging:
        # Setup logging with google cloud
        client = google.cloud.logging.Client()
        client.setup_logging()
        handler = client.get_default_handler()
        handler.setFormatter(logging.Formatter(kwolaLoggingFormatString, kwolaDateFormatString))

        logger = getLogger()
        logger.handlers = logger.handlers[0:1]
    else:
        setupLocalLogging()

    if configData['features']['enableSlackLogging']:
        logger = getLogger()
        logger.addHandler(SlackLogHandler())

    connectToMongoWithRetries()

    stripe.api_key = configData['stripe']['apiKey']

    getLogger().info(f"Finished initialization routine for kwola cloud process with pid {os.getpid()}.")
