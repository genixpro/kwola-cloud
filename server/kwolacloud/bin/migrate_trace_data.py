#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadConfiguration
from kwola.config.config import KwolaCoreConfiguration
import traceback
import stripe
from pprint import pformat
from kwola.config.logger import getLogger
import logging
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from ..helpers.slack import SlackLogHandler
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from google.cloud import storage
import json
import multiprocessing
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess

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
        # logging.info(f"Loading trace object {traceId}")

        trace = ExecutionTrace.loadFromDisk(traceId, config)
        if trace is None:
            # hasNone = True
            break

        traces.append(trace)
    return traces, hasNone

def saveTrace(trace, config):
    # logging.info(f"Saving trace object {trace.id}")
    trace.saveToDisk(config)

def processSession(sessionId):
    try:
        logging.info(f"Processing session {sessionId}")

        # connectToMongoWithRetries()

        session = ExecutionSession.objects(id=sessionId).first()

        if len(session.executionTraces) == 0:
            logging.info(f"Skipping session {session.id} because it has no execution traces")
            return "skip_no_trace"

        if session.applicationId is None:
            logging.info(f"Skipping session {session.id} because its applicationId is None")
            return "skip_no_app_id"

        configDir = mountTestingRunStorageDrive(applicationId=session.applicationId)
    except Exception as e:
        logging.info(f"Received an error while processing {sessionId}: {traceback.format_exc()}")
        return traceback.format_exc()

    try:
        config = KwolaCoreConfiguration(configDir)
        config['data_compress_level'] = {"default": 0}
        config["data_serialization_method"] = {"default": "mongo"}
        config["data_enable_local_file_locking"] = False

        logging.info(f"Starting trace loading for session {session.id}")

        traces, hasNone = loadTraces(config, session)

        logging.info(f"Finished trace loading for session {session.id}")

        if hasNone:
            logging.info(f"Skipping session {session.id} because I was not able to load all of the execution traces.")
            unmountTestingRunStorageDrive(configDir)
            return "skip_no_traces"

        config['data_compress_level'] = {
            "default": 0,
            "ExecutionTrace": 9
        }

        config["data_serialization_method"] = {
            "default": "mongo",
            "ExecutionTrace": "json"
        }
        config["data_enable_local_file_locking"] = False

        logging.info(f"Starting trace saving for session {session.id}")

        with ThreadPoolExecutor(max_workers=8) as executor:
            for trace in traces:
                if trace is not None:
                    executor.submit(saveTrace, trace, config)

        logging.info(f"Finished trace saving for session {session.id}")

        storageClient = storage.Client()
        applicationStorageBucket = storage.Bucket(storageClient, "kwola-testing-run-data-" + session.applicationId)
        configFileBlob = storage.Blob("kwola.json", applicationStorageBucket)
        configFileBlob.upload_from_string(json.dumps(config.configData))

        logging.info(f"Saved the config object {session.id}. Unmounting storage drive")

        # config.saveConfig()

        unmountTestingRunStorageDrive(configDir)

        logging.info(f"Deleting old trace objects for session {session.id}.")
        tracesInDb = ExecutionTrace.objects(executionSessionId=session.id)
        tracesInDb.delete()
        logging.info(f"Finished processing session {session.id}.")
        return "success"
    except Exception as e:
        unmountTestingRunStorageDrive(configDir)
        logging.info(f"Received an error while processing {sessionId}: {traceback.format_exc()}")
        return traceback.format_exc()

def main():
    try:
        initializeKwolaCloudProcess()

        ctx = multiprocessing.get_context('spawn')

        pool = ctx.Pool(processes=8, initializer=initializeKwolaCloudProcess, maxtasksperchild=25)

        sessionIdsToProcess = set()
        for trace in ExecutionTrace.objects().only('executionSessionId'):
            sessionIdsToProcess.add(trace.executionSessionId)
            # logging.info(f"Queueing session for {session.id}.")
            # asyncResult = pool.apply_async(processSession, args=[session.id])
            # resultObjects.append((session.id, asyncResult))

        resultObjects = []
        for sessionId in sessionIdsToProcess:
            # logging.info(f"Queueing session for {session.id}.")
            asyncResult = pool.apply_async(processSession, args=[sessionId])
            resultObjects.append((sessionId, asyncResult))

        for sessionId, asyncResult in resultObjects:
            asyncResult.wait()
            result = asyncResult.get()
            # logging.info(f"Result for session {sessionId}: {result}")

        pool.close()
        pool.join()
    except Exception as e:
        logging.info(f"Received an error while running the migration task: {traceback.format_exc()}")
