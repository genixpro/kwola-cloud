#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from kwola.config.config import Configuration
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.CustomIDField import CustomIDField
from ..datamodels.id_utility import generateKwolaId
from kwola.tasks import RunTestingStep
from ..config.config import loadConfiguration, getKwolaConfiguration
import logging
import os
from .utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive, verifyStripeSubscription, attachUsageBilling
from kwolacloud.components.KubernetesJobProcess import KubernetesJobProcess


def runOneTestingStepForRun(testingRunId, testingStepsCompleted, maxSessionsToBill):
    logging.info(f"Starting testing step for testing run {testingRunId}")

    run = TestingRun.objects(id=testingRunId).first()

    configData = loadConfiguration()

    if run is None:
        logging.error(f"Error! {testingRunId} not found.")
        return {"success": False}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
        return {"success": False}

    if not configData['features']['localRuns']:
        configDir = mountTestingRunStorageDrive(run.applicationId)
        if configDir is None:
            return {"success": False}
    else:
        configDir = os.path.join("data", run.applicationId)

    try:
        config = Configuration(configDir)

        # Deduct the sessions we are about to perform from the available list
        modifiedObjects = TestingRun.objects(id=testingRunId, testingSessionsRemaining__gte=1).update_one(dec__testingSessionsRemaining=config['web_session_parallel_execution_sessions'])

        if modifiedObjects == 0:
            logging.warning(f"Warning! Not enough testing sessions remaining on testing run to perform this testing step, which requires {config['web_session_parallel_execution_sessions']} sessions. Probably due to prior sessions failing.")
            return {"success": True}

        shouldBeRandom = False
        if testingStepsCompleted < (config['training_random_initialization_sequences']):
            shouldBeRandom = True

        newID = generateKwolaId(modelClass=TestingStep, kwolaConfig=config, owner=run.owner)
        testingStep = TestingStep(id=newID, testingRunId=testingRunId, owner=run.owner, applicationId=run.applicationId)
        testingStep.saveToDisk(config)

        result = RunTestingStep.runTestingStep(configDir, str(testingStep.id), shouldBeRandom)

        attachUsageBilling(config, run, sessionsToBill=min(maxSessionsToBill, result['successfulExecutionSessions']))

        logging.info(f"Finished testing step for testing run {testingRunId}")

        return result
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTestingStepForRun)
    task.run()


