#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import traceback
import logging
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
import billiard as multiprocessing
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess

# Do not remove the following unused imports, as they are actually required
# For the migration script to function correctly.
from kwola.datamodels.actions.BaseAction import BaseAction
from kwola.datamodels.actions.ClearFieldAction import ClearFieldAction
from kwola.datamodels.actions.ClickTapAction import ClickTapAction
from kwola.datamodels.actions.RightClickAction import RightClickAction
from kwola.datamodels.actions.ScrollingAction import ScrollingAction
from kwola.datamodels.actions.TypeAction import TypeAction
from kwola.datamodels.actions.WaitAction import WaitAction
from kwola.datamodels.errors.BaseError import BaseError
from kwola.datamodels.errors.ExceptionError import ExceptionError
from kwola.datamodels.errors.HttpError import HttpError
from kwola.datamodels.errors.LogError import LogError
from kwola.datamodels.errors.DotNetRPCError import DotNetRPCError

def processExecutionSession(executionSessionId):
    try:
        logging.info(f"Processing session {executionSessionId}")

        # connectToMongoWithRetries()

        executionSession = ExecutionSession.objects(id=executionSessionId).first()

        # We do two changes here to make sure the dirty flag is set correctly
        # mongo engine doesn't handle newly added fields very well
        executionSession.isChangeDetectionSession = True
        executionSession.save()

        executionSession.isChangeDetectionSession = False
        executionSession.save()

    except Exception as e:
        logging.info(f"Received an error while processing {executionSessionId}: {traceback.format_exc()}")
        return traceback.format_exc()

def main():
    try:
        initializeKwolaCloudProcess()

        ctx = multiprocessing.get_context('spawn')

        pool = ctx.Pool(processes=2, initializer=initializeKwolaCloudProcess, maxtasksperchild=None)

        executionSessionIdsToProcess = set()
        for bug in ExecutionSession.objects(isChangeDetectionSession__exists=False).only('id'):
            executionSessionIdsToProcess.add(bug.id)

        resultObjects = []
        for sessionId in executionSessionIdsToProcess:
            # logging.info(f"Queueing session for {executionSessionId}.")
            asyncResult = pool.apply_async(processExecutionSession, args=[sessionId])
            resultObjects.append((sessionId, asyncResult))

        for sessionId, asyncResult in resultObjects:
            asyncResult.wait()
            result = asyncResult.get()
            if result:
                logging.info(f"Result for execution session {sessionId}: {result}")

        pool.close()
        pool.join()

    except Exception as e:
        logging.info(f"Received an error while running the migration task: {traceback.format_exc()}")

