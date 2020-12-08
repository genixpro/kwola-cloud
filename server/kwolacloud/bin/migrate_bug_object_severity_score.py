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
from kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects

def main():
    try:
        initializeKwolaCloudProcess()

        for bug in BugModel.objects():
            bug.recomputeBugQualitativeFeatures()
            if bug.isBugNew is None:
                bug.isBugNew = True
            bug.save()
            logging.info(f"Processed bug {bug.id}")

    except Exception as e:
        logging.info(f"Received an error while running the migration task: {traceback.format_exc()}")

