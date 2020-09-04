#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from kwola.tasks import RunTrainingStep
import logging
import traceback
import os
from .utils import mountTestingRunStorageDrive, verifyStripeSubscription
from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from ..config.config import loadConfiguration


def runOneTrainingStepForRun(testingRunId, trainingStepsCompleted):
    logging.info(f"Starting training step for testing run {testingRunId}")
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
        gpu = 0

        result = RunTrainingStep.runTrainingStep(configDir, testingRunId, trainingStepsCompleted, gpu=gpu, testingRunId=testingRunId, applicationId=run.applicationId, gpuWorldSize=1)

        logging.info(f"Completed training step for testing run {testingRunId}")
        return result
    except Exception as e:
        errorMessage = f"{traceback.format_exc()}"
        logging.error(f"[{os.getpid()}] {errorMessage}")
        return {"success": False, "exception": errorMessage}
    finally:
        # unmountTestingRunStorageDrive(configDir)
        pass


if __name__ == "__main__":
    task = KubernetesJobProcess(runOneTrainingStepForRun)
    task.run()


