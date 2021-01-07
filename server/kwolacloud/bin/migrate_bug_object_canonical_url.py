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
from kwola.datamodels.BugModel import BugModel
from kwolacloud.datamodels.TestingRun import TestingRun
from ..helpers.slack import SlackLogHandler
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from google.cloud import storage
import json
import billiard as multiprocessing
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess
from kwola.components.utils.retry import autoretry

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
from kwola.datamodels.errors.DotNetRPCError import DotNetRPCError
from kwola.datamodels.errors.HttpError import HttpError
from kwola.datamodels.errors.LogError import LogError
from kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects
from pymongo.errors import WriteConcernError

@autoretry()
def processBug(bugId):
    try:
        bug = BugModel.objects(id=bugId).first()
        if bug is None:
            return

        run = TestingRun.objects(id=bug.testingRunId).first()
        if run is None:
            return

        if run.configuration is None:
            return

        config = run.configuration.createKwolaCoreConfiguration(run.owner, run.applicationId, run.id)

        session = ExecutionSession.objects(id=bug.executionSessionId).first()
        if session is None:
            return
        traceId = session.executionTraces[bug.stepNumber]
        trace = ExecutionTrace.loadFromDisk(traceId, config, applicationId=run.applicationId)
        if trace is None:
            return
        bug.error.page = trace.finishURL

        bug.recomputeCanonicalPageUrl()
        bug.save()

        logging.info(f"Processed bug {bug.id}")

    except WriteConcernError:
        raise # Let this exception pass through, triggering autoretry
    except Exception as e:
        logging.error(f"Received an error while running the migration task: {traceback.format_exc()}")

def main():
    try:
        initializeKwolaCloudProcess()

        ctx = multiprocessing.get_context('spawn')
        pool = ctx.Pool(processes=4, initializer=initializeKwolaCloudProcess, maxtasksperchild=1)

        futures = []
        for bug in BugModel.objects().only("id"):
            future = pool.apply_async(processBug, args=[bug.id])
            futures.append(future)
        
        for future in futures:
            future.get()

        pool.close()
        pool.join()

    except Exception as e:
        logging.error(f"Received an error while running the migration task: {traceback.format_exc()}")

