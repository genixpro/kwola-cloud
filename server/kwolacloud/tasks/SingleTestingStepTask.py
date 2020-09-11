#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from kwola.config.config import Configuration
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.BugModel import BugModel
from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from ..datamodels.id_utility import generateKwolaId
from kwola.tasks import RunTestingStep
from ..config.config import loadConfiguration
import logging
from ..helpers.slack import postToCustomerSlack
from ..helpers.jira import postBugToCustomerJIRA
import os
from .utils import mountTestingRunStorageDrive, verifyStripeSubscription, attachUsageBilling
from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
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
        config = Configuration(configDir)

        shouldBeRandom = False
        if testingStepsCompleted < (config['training_random_initialization_sequences']):
            shouldBeRandom = True

        newID = generateKwolaId(modelClass=TestingStep, kwolaConfig=config, owner=run.owner)
        testingStep = TestingStep(id=newID, testingRunId=testingRunId, owner=run.owner, applicationId=run.applicationId)
        testingStep.saveToDisk(config)

        result = RunTestingStep.runTestingStep(configDir, str(testingStep.id), shouldBeRandom)

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


