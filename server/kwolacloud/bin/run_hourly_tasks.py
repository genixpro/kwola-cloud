#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadConfiguration
import stripe
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from ..helpers.slack import SlackLogHandler
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess


def main():
        initializeKwolaCloudProcess()

        runHourlyTasks()

