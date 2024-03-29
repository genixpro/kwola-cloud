#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


import google
import google.cloud
import google.cloud.logging
from ..config.config import loadCloudConfiguration
import stripe
from kwola.config.logger import getLogger
from ..db import connectToMongoWithRetries
from kwolacloud.tasks.RunHourlyTasks import runHourlyTasks
from ..helpers.slack import SlackLogHandler
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess


def main():
        initializeKwolaCloudProcess()

        runHourlyTasks()

