#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..app import celeryApplication
from ..datamodels.TestingRun import TestingRun
from kwola.datamodels.TrainingStepModel import TrainingStep
from kwola.config.config import Configuration
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks import RunTrainingStep
import logging
from .utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive, verifyStripeSubscription
from kwolacloud.components.KubernetesJobProcess import KubernetesJobProcess



def runOneTrainingStepForRun(testingRunId, trainingStepsCompleted):
    logging.info(f"Starting training step for testing run {testingRunId}")
    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        logging.error(f"Error! {testingRunId} not found.")
        return {"success":False}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
        return {"success": False}

    configDir = mountTestingRunStorageDrive(testingRunId)
    if configDir is None:
        return {"success":False}

    try:
        config = Configuration(configDir)

        trainingStep = TrainingStep(id=CustomIDField.generateNewUUID(TrainingStep, config), testingRunId=testingRunId, owner=run.owner)
        trainingStep.saveToDisk(config)

        result = RunTrainingStep.runTrainingStep(configDir, str(trainingStep.id), trainingStepsCompleted, gpu=0)

        logging.info(f"Completed training step for testing run {testingRunId}")
        return result
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


@celeryApplication.task(queue="training", acks_late=True)
def runOneTrainingStepForRunTask(testingRunId, trainingStepsCompleted):
    runOneTrainingStepForRun(testingRunId, trainingStepsCompleted)


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTrainingStepForRun)
    task.run()

