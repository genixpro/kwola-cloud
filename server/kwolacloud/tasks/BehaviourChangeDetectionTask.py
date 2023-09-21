#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from ..config.config import loadCloudConfiguration, getKwolaConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.TestingRun import TestingRun
from ..helpers.jira import postBugToCustomerJIRA
from ..helpers.slack import postToCustomerSlack
from datetime import datetime
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from kwolacloud.components.core.BehaviouralChangeDetector import BehaviourChangeDetector
from pprint import pformat
import json
import logging
import os
import traceback


def createBehaviourChangeDetectionKubernetesJobObject(testingRunId, executionSessionId=None):
    from kwolacloud.components.utils.KubernetesJob import KubernetesJob

    configData = loadCloudConfiguration()

    if configData['features']['localRuns']:
        job = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.BehaviourChangeDetectionTaskLocal"], {
            "testingRunId": testingRunId,
            "executionSessionId": executionSessionId
        }, timeout=1800, config=getKwolaConfiguration(), logId=None)
    else:
        referenceId = testingRunId + "-change-detection"
        if executionSessionId is not None:
            referenceId = executionSessionId + "-change-detection"

        job = KubernetesJob(module="kwolacloud.tasks.BehaviourChangeDetectionTask",
                            data={
                                "testingRunId": testingRunId,
                                "executionSessionId": executionSessionId
                            },
                            referenceId=referenceId,
                            image="worker",
                            cpuRequest="3500m",
                            cpuLimit="4000m",
                            memoryRequest="9.0Gi",
                            memoryLimit="12.0Gi",
                          )
    return job


def runBehaviourChangeDetectionJob(testingRunId, executionSessionId=None):
    configData = loadCloudConfiguration()

    job = createBehaviourChangeDetectionKubernetesJobObject(testingRunId, executionSessionId)

    if configData['features']['enableRuns']:
        if not configData['features']['localRuns'] and job.doesJobStillExist():
            job.cleanup()

        job.start()


def runBehaviourChangeDetectionAlgorithm(testingRunId, executionSessionId=None):
    if executionSessionId is None:
        logging.info(f"Starting behaviour change detection task for TestingRun {testingRunId}")
    else:
        logging.info(f"Starting behaviour change detection task for execution session {executionSessionId}")

    run = TestingRun.objects(id=testingRunId).first()

    configData = loadCloudConfiguration()

    try:
        config = run.configuration.createKwolaCoreConfiguration(run.owner, run.applicationId, run.id)

        priorTestingRun = TestingRun.objects(applicationId=run.applicationId, status="completed").order_by("-startTime").first()

        if executionSessionId is None:
            priorExecutionSessions = ExecutionSession.objects(owner=priorTestingRun.owner,
                                                         applicationId=run.applicationId,
                                                         testingRunId=priorTestingRun.id,
                                                         status="completed",
                                                         useForFutureChangeDetection=True,
                                                         )
        else:
            priorExecutionSessions = ExecutionSession.objects(id=executionSessionId)

        changeDetector = BehaviourChangeDetector(config)

        seenDifferenceHashes = set()

        for priorSession in priorExecutionSessions:
            # Try to see if we already ran change detection on this prior session,
            # e.g. if the process crashed and restarted, we don't want to rerun
            # change detection
            existingChangeDetectionSession = ExecutionSession.objects(owner=priorTestingRun.owner,
                                                                      testingRunId=testingRunId,
                                                                      status="completed",
                                                                      changeDetectionPriorExecutionSessionId=priorSession.id,
                                                                      isChangeDetectionSession=True).first()

            if existingChangeDetectionSession is None:
                changeDetector.findAllChangesForExecutionSession(priorSession, seenDifferenceHashes, testingRunId)

        if executionSessionId is None:
            logging.info(f"Finished change detection for testing run {testingRunId}")
        else:
            logging.info(f"Finished change detection for execution session {executionSessionId}")

        return {"success": True}
    except Exception as e:
        errorMessage = f"{traceback.format_exc()}"
        logging.error(f"{errorMessage}")
        return {"success": False, "exception": errorMessage}



if __name__ == "__main__":
    task = KubernetesJobProcess(runBehaviourChangeDetectionAlgorithm)
    task.run()


