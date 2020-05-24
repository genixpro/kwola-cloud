#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from kwola.datamodels.TrainingStepModel import TrainingStep
from kwola.config.config import Configuration
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks import RunTrainingStep
import logging
import torch
from .utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive, verifyStripeSubscription
from kwolacloud.components.KubernetesJobProcess import KubernetesJobProcess



def runOneTrainingStepForRun(testingRunId, trainingStepsCompleted):
    logging.info(f"Starting training step for testing run {testingRunId}")
    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        logging.error(f"Error! {testingRunId} not found.")
        return {"success": False}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
        return {"success": False}

    configDir = mountTestingRunStorageDrive(run.applicationId)
    if configDir is None:
        return {"success": False}

    try:
        gpu = None
        if torch.cuda.device_count() > 0:
            gpu = 0

        result = RunTrainingStep.runTrainingStep(configDir, testingRunId, trainingStepsCompleted, gpu=gpu, testingRunId=testingRunId, applicationId=run.applicationId, gpuWorldSize=1)

        logging.info(f"Completed training step for testing run {testingRunId}")
        return result
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTrainingStepForRun)
    task.run()


