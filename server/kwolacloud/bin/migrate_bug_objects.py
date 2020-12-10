#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadCloudConfiguration
from kwola.config.config import KwolaCoreConfiguration
import traceback
import stripe
from pprint import pformat
from kwola.config.logger import getLogger
import logging
import os
import pickle
import tempfile
import shutil
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwolacloud.datamodels.TestingRun import TestingRun
from kwola.datamodels.BugModel import BugModel
from ..helpers.slack import SlackLogHandler
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from google.cloud import storage
import json
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
from kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects

def processBug(bugId):
    try:
        logging.info(f"Processing bug {bugId}")

        # connectToMongoWithRetries()

        bug = BugModel.objects(id=bugId).first()

        executionSession = ExecutionSession.objects(id=bug.executionSessionId).first()
        testingRun = TestingRun.objects(id=bug.testingRunId).first()

        if executionSession is None:
            return

        if bug.applicationId is None:
            bug.applicationId = executionSession.applicationId

        config = testingRun.configuration.createKwolaCoreConfiguration(testingRun.applicationId)

        if not bug.actionsPerformed or len(bug.actionsPerformed) == 0:
            actionsPerformed = []
            for traceId in executionSession.executionTraces[:bug.stepNumber + 2]:
                trace = ExecutionTrace.loadFromDisk(traceId, config, omitLargeFields=True, applicationId=executionSession.applicationId)
                actionsPerformed.append(trace.actionPerformed)

            bug.actionsPerformed = actionsPerformed

        plugin = CreateCloudBugObjects(config)
        plugin.generateFrameSpriteSheetsForBugs([bug])

        bug.save()

    except Exception as e:
        logging.info(f"Received an error while processing {bugId}: {traceback.format_exc()}")
        return traceback.format_exc()

def main():
    try:
        initializeKwolaCloudProcess()

        ctx = multiprocessing.get_context('spawn')

        pool = ctx.Pool(processes=2, initializer=initializeKwolaCloudProcess, maxtasksperchild=None)

        bugIdsToProcess = set()
        for bug in BugModel.objects(actionsPerformed__exists=False).only('id'):
            bugIdsToProcess.add(bug.id)

        resultObjects = []
        for bugId in bugIdsToProcess:
            # logging.info(f"Queueing bug for {bugId}.")
            asyncResult = pool.apply_async(processBug, args=[bugId])
            resultObjects.append((bugId, asyncResult))

        for bugId, asyncResult in resultObjects:
            asyncResult.wait()
            result = asyncResult.get()
            logging.info(f"Result for bug {bugId}: {result}")

        pool.close()
        pool.join()

    except Exception as e:
        logging.info(f"Received an error while running the migration task: {traceback.format_exc()}")

