#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..config.config import loadConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.TestingRun import TestingRun
from ..helpers.jira import postBugToCustomerJIRA
from ..helpers.slack import postToCustomerSlack
from .utils import mountTestingRunStorageDrive, verifyStripeSubscription, attachUsageBilling
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
from  kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects
import logging
import json
import os
import traceback


def runOneTestingStepForRun(testingRunId, testingStepsCompleted):
    logging.info(f"Starting testing step for testing run {testingRunId}")

    run = TestingRun.objects(id=testingRunId).first()

    configData = loadConfiguration()

    if run is None:
        errorMessage = f"Error! {testingRunId} not found."
        logging.error(f"[{os.getpid()}] {errorMessage}")
        return {"success": False, "exception": errorMessage}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
       return {"success": False}

    if not configData['features']['localRuns']:
        configDir = mountTestingRunStorageDrive(run.applicationId)
        if configDir is None:
            errorMessage = f"{traceback.format_exc()}"
            logging.error(f"[{os.getpid()}] {errorMessage}")
            return {"success": False, "exception": errorMessage}
    else:
        configDir = os.path.join("data", run.applicationId)

    try:
        config = KwolaCoreConfiguration(configDir)

        shouldBeRandom = False
        if testingStepsCompleted < (config['training_random_initialization_sequences']):
            shouldBeRandom = True

        newID = generateKwolaId(modelClass=TestingStep, kwolaConfig=config, owner=run.owner)
        testingStep = TestingStep(id=newID, testingRunId=testingRunId, owner=run.owner, applicationId=run.applicationId)
        testingStep.saveToDisk(config)

        application = ApplicationModel.objects(id=run.applicationId).limit(1).first()

        plugins = [
            CreateCloudBugObjects(config),
            LogSessionRewards(config),
            LogSessionActionExecutionTimes(config),
            PrecomputeSessionsForSampleCache(config),
            GenerateAnnotatedVideos(config),
            SendExecutionSessionWebhooks(config, application)
        ]

        result = RunTestingStep.runTestingStep(configDir, str(testingStep.id), shouldBeRandom, plugins)

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

        if result['success'] and 'successfulExecutionSessions' in result:
            attachUsageBilling(config, run, sessionsToBill=result['successfulExecutionSessions'])

        logging.info(f"Finished testing step for testing run {testingRunId}")

        return result
    except Exception as e:
        errorMessage = f"{traceback.format_exc()}"
        logging.error(f"[{os.getpid()}] {errorMessage}")
        return {"success": False, "exception": errorMessage}
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTestingStepForRun)
    task.run()


