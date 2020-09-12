#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadConfiguration
from kwola.config.config import Configuration
import traceback
import stripe
from pprint import pformat
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from ..helpers.slack import SlackLogHandler

# Do not remove the following unused imports, as they are actually required
# For the migration script to function correctly.
from kwola.datamodels.actions.BaseAction import BaseAction
from kwola.datamodels.actions.ClearFieldAction import ClearFieldAction
from kwola.datamodels.actions.ClickTapAction import ClickTapAction
from kwola.datamodels.actions.RightClickAction import RightClickAction
from kwola.datamodels.actions.TypeAction import TypeAction
from kwola.datamodels.actions.WaitAction import WaitAction
from kwola.datamodels.errors.BaseError import BaseError
from kwola.datamodels.errors.ExceptionError import ExceptionError
from kwola.datamodels.errors.HttpError import HttpError
from kwola.datamodels.errors.LogError import LogError
from kwolacloud.tasks.utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive

def loadTraces(config, session):
    hasNone = False
    traces = []
    for traceId in session.executionTraces:
        getLogger().info(f"Loading trace object {traceId}")

        trace = ExecutionTrace.loadFromDisk(traceId, config)
        if trace is None:
            hasNone = True
            break

        traces.append(trace)
    return traces, hasNone

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

        for session in ExecutionSession.objects():
            try:
                if len(session.executionTraces) == 0:
                    continue

                getLogger().info(f"Processing session {session.id}")

                if session.applicationId is None:
                    continue

                configDir = mountTestingRunStorageDrive(applicationId=session.applicationId)
                config = Configuration(configDir)

                config['data_compress_level'] = {"default": 0}
                config["data_serialization_method"] = {"default": "mongo"}

                getLogger().info(f"Current serialization method: {pformat(config['data_serialization_method'])}")

                traces, hasNone = loadTraces(config, session)

                if hasNone:
                    getLogger().info(f"Skipping session {session.id} because I was not able to load all of the execution traces.")
                    continue

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
            except Exception as e:
                getLogger().info(f"Received an error while processing {session.id}: {traceback.format_exc()}")

