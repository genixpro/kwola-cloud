import google
import google.cloud
import google.cloud.logging
from ..config.config import loadConfiguration
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from ..helpers.slack import SlackLogHandler
import multiprocessing
import stripe
from kwola.config.logger import getLogger, setupLocalLogging


def initializeKwolaCloudProcess(localLogging=False):
    try:
        multiprocessing.set_start_method('spawn')
    except RuntimeError:
        pass

    configData = loadConfiguration()

    if configData['features']['enableGoogleCloudLogging'] and not localLogging:
        # Setup logging with google cloud
        client = google.cloud.logging.Client()
        client.get_default_handler()
        client.setup_logging()

        logger = getLogger()
        logger.handlers = logger.handlers[0:1]
    else:
        setupLocalLogging()

    if configData['features']['enableSlackLogging']:
        logger = getLogger()
        logger.addHandler(SlackLogHandler())

    connectToMongoWithRetries()

    stripe.api_key = configData['stripe']['apiKey']

    getLogger().info("Finished initialization routine for kwola cloud process.")
