#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadConfiguration
from kwola.config.config import Configuration
import stripe
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwolacloud.tasks.utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive

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

        for session in ExecutionSession.objects():
            getLogger().info(f"Processing session {session.id}")

            if session.applicationId is None:
                continue

            configDir = mountTestingRunStorageDrive(applicationId=session.applicationId)
            config = Configuration(configDir)

            traces = [ExecutionTrace.loadFromDisk(traceId, config) for traceId in session.executionTraces]

            config['data_compress_level'] = {
                "default": 0,
                "ExecutionTrace": 9
              }

            config["data_serialization_method"] = {
                "default": "mongo",
                "ExecutionTrace": "json"
            }

            for trace in traces:
                getLogger().info(f"Saving trace object {trace.id}")
                trace.saveToDisk(config)

            config.saveConfig()

            unmountTestingRunStorageDrive(configDir)

            tracesInDb = ExecutionTrace.objects(executionSessionId=session.id)
            tracesInDb.delete()
