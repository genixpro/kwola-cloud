#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..config.config import loadConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.TestingRun import TestingRun
from ..helpers.jira import postBugToCustomerJIRA
from ..helpers.slack import postToCustomerSlack
from .utils import mountTestingRunStorageDrive, verifyStripeSubscription
from kwola.components.plugins.core.CreateLocalBugObjects import CreateLocalBugObjects
from kwola.components.plugins.core.GenerateAnnotatedVideos import GenerateAnnotatedVideos
from kwola.components.plugins.core.LogSessionActionExecutionTimes import LogSessionActionExecutionTimes
from kwola.components.plugins.core.LogSessionRewards import LogSessionRewards
from kwola.components.plugins.core.PrecomputeSessionsForSampleCache import PrecomputeSessionsForSampleCache
from kwolacloud.components.plugins.SendExecutionSessionWebhooks import SendExecutionSessionWebhooks
from kwola.config.config import KwolaCoreConfiguration
from kwola.datamodels.BugModel import BugModel
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.tasks import RunTestingStep
from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from kwolacloud.helpers.webhook import sendCustomerWebhook
from kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects
from pprint import pformat
import logging
import json
import os
import traceback


def runOneTestingStepForRun(testingRunId, testingStepIndex):
    logging.info(f"Starting testing step for testing run {testingRunId}")

    run = TestingRun.objects(id=testingRunId).first()

    logging.info(f"Testing run obj: {pformat(json.loads(run.to_json()))}")

    configData = loadConfiguration()

    if run is None:
        errorMessage = f"Error! {testingRunId} not found."
        logging.error(f"{errorMessage}")
        return {"success": False, "exception": errorMessage}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
       return {"success": False}

    if not configData['features']['localRuns']:
        configDir = mountTestingRunStorageDrive(run.applicationId)
        if configDir is None:
            errorMessage = f"{traceback.format_exc()}"
            logging.error(f"{errorMessage}")
            return {"success": False, "exception": errorMessage}
    else:
        configDir = os.path.join("data", run.applicationId)

    try:
        config = KwolaCoreConfiguration(configDir)

        shouldBeRandom = False
        if testingStepIndex < (config['training_random_initialization_sequences']):
            shouldBeRandom = True

        browsers = []
        if config['web_session_enable_chrome']:
            browsers.append('chrome')

        if config['web_session_enable_firefox']:
            browsers.append('firefox')

        if config['web_session_enable_edge']:
            browsers.append('edge')

        chosenBrowser = browsers[testingStepIndex % len(browsers)]

        newID = generateKwolaId(modelClass=TestingStep, kwolaConfig=config, owner=run.owner)
        testingStep = TestingStep(id=newID, testingRunId=testingRunId, owner=run.owner, applicationId=run.applicationId, browser=chosenBrowser)
        testingStep.saveToDisk(config)

        logging.info(f"This testing step was given the id: {newID}")

        application = ApplicationModel.objects(id=run.applicationId).limit(1).first()

        # Special override here: if the application object has been marked as deleted, or is literally deleted and
        # missing from the database, then do not continue the testing run. Just finish quietly.
        if application is None or application.status != "active":
            return {"success": False, "exception": f"The application object with id {run.applicationId} is either missing from the database or has been marked as deleted by the user."}

        plugins = [
            CreateCloudBugObjects(config),
            LogSessionRewards(config),
            LogSessionActionExecutionTimes(config),
            PrecomputeSessionsForSampleCache(config),
            GenerateAnnotatedVideos(config),
            SendExecutionSessionWebhooks(config, application)
        ]

        result = RunTestingStep.runTestingStep(configDir, str(testingStep.id), shouldBeRandom=shouldBeRandom, plugins=plugins, browser=chosenBrowser)

        application = ApplicationModel.objects(id=run.applicationId).limit(1).first()
        bugs = BugModel.objects(owner=run.owner, testingStepId=newID, isMuted=False)
        for bug in bugs:
            if application.enableEmailNewBugNotifications:
                # sendBugFoundNotification(application, bug)
                pass

            if application.enableSlackNewBugNotifications:
                postToCustomerSlack(
                    f"A new error has been found. View the bug here: {configData['frontend']['url']}app/dashboard/bugs/{bug.id}",
                    application,
                    bug.error.message
                )

            if application.enablePushBugsToJIRA:
                postBugToCustomerJIRA(bug, application)

            if application.bugFoundWebhookURL:
                sendCustomerWebhook(application, "bugFoundWebhookURL", json.loads(bug.to_json()))

        logging.info(f"Finished testing step for testing run {testingRunId}")

        return result
    except Exception as e:
        errorMessage = f"{traceback.format_exc()}"
        logging.error(f"{errorMessage}")
        return {"success": False, "exception": errorMessage}
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTestingStepForRun)
    task.run()


