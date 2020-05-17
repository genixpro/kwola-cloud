#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from kwola.config.config import Configuration
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks import RunTestingStep
import logging
from .utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive, verifyStripeSubscription, attachUsageBilling
from kwolacloud.components.KubernetesJobProcess import KubernetesJobProcess


def runOneTestingStepForRun(testingRunId, testingStepsCompleted, maxSessionsToBill):
    logging.info(f"Starting testing step for testing run {testingRunId}")

    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        logging.error(f"Error! {testingRunId} not found.")
        return {"success": False}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
        return {"success": False}

    configDir = mountTestingRunStorageDrive(testingRunId)
    if configDir is None:
        return {"success": False}

    try:
        config = Configuration(configDir)

        # Deduct the sessions we are about to perform from the available list
        modifiedObjects = TestingRun.objects(id=testingRunId, testingSessionsRemaining__gt=config['web_session_parallel_execution_sessions']).update_one(dec__testingSessionsRemaining=config['web_session_parallel_execution_sessions'])

        if modifiedObjects == 0:
            logging.warning(f"Warning! Not enough testing sessions remaining on testing run to perform this testing step, which requires {config['web_session_parallel_execution_sessions']} sessions. Probably due to prior sessions failing.")
            return {"success": True}

        shouldBeRandom = False
        if testingStepsCompleted < (config['training_random_initialization_sequences']):
            shouldBeRandom = True

        testingStep = TestingStep(id=CustomIDField.generateNewUUID(TestingStep, config), testingRunId=testingRunId, owner=run.owner, applicationId=run.applicationId)
        testingStep.saveToDisk(config)

        result = RunTestingStep.runTestingStep(configDir, str(testingStep.id), shouldBeRandom)

        attachUsageBilling(config, run, maxSessionsToBill)

        logging.info(f"Finished testing step for testing run {testingRunId}")

        return result
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTestingStepForRun)
    task.run()


