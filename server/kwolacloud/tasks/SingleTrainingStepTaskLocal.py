#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from .SingleTrainingStepTask import runOneTrainingStepForRun
from kwola.tasks.TaskProcess import TaskProcess
import google.cloud.logging
from ..config.config import loadConfiguration
from mongoengine import connect
import stripe
from kwola.config.logger import getLogger, setupLocalLogging

if __name__ == "__main__":
    configData = loadConfiguration()

    setupLocalLogging()

    connect(configData['mongo']['db'], host=configData['mongo']['uri'])

    stripe.api_key = configData['stripe']['apiKey']

    task = TaskProcess(runOneTrainingStepForRun)
    task.run()

