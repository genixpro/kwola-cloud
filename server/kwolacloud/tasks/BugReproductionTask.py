#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..config.config import loadCloudConfiguration, getKwolaConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.TestingRun import TestingRun
from ..helpers.jira import postBugToCustomerJIRA
from ..helpers.slack import postToCustomerSlack
from datetime import datetime
from kwola.components.environments.WebEnvironment import WebEnvironment
from kwola.components.plugins.core.CreateLocalBugObjects import CreateLocalBugObjects
from kwola.components.plugins.core.RecordScreenshots import RecordScreenshots
from kwola.components.plugins.core.GenerateAnnotatedVideos import GenerateAnnotatedVideos
from kwola.components.plugins.core.LogSessionActionExecutionTimes import LogSessionActionExecutionTimes
from kwola.components.plugins.core.LogSessionRewards import LogSessionRewards
from kwola.components.plugins.core.PrecomputeSessionsForSampleCache import PrecomputeSessionsForSampleCache
from kwola.config.config import KwolaCoreConfiguration
from kwola.datamodels.BugModel import BugModel
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.tasks import RunTestingStep
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from kwolacloud.components.core.BugReproducer import BugReproducer
from kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects
from kwolacloud.components.plugins.SendExecutionSessionWebhooks import SendExecutionSessionWebhooks
from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from kwolacloud.helpers.webhook import sendCustomerWebhook
from pprint import pformat
import json
import logging
import os
import traceback


def createBugReproductionKubernetesJobObject(bug):
    from kwolacloud.components.utils.KubernetesJob import KubernetesJob

    configData = loadCloudConfiguration()

    if configData['features']['localRuns']:
        job = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.BugReproductionTaskLocal"], {
            "bugId": bug.id
        }, timeout=1800, config=getKwolaConfiguration(), logId=None)
    else:
        job = KubernetesJob(module="kwolacloud.tasks.BugReproductionTask",
                            data={
                                "bugId": bug.id
                            },
                            referenceId=bug.id + "-bug-reproduction",
                            image="worker",
                            cpuRequest="3500m",
                            cpuLimit="4000m",
                            memoryRequest="9.0Gi",
                            memoryLimit="12.0Gi",
                          )
    return job


def runBugReproductionJob(bug):
    configData = loadCloudConfiguration()

    job = createBugReproductionKubernetesJobObject(bug)

    if configData['features']['enableRuns']:
        if not configData['features']['localRuns'] and job.doesJobStillExist():
            job.cleanup()

        job.start()


def runBugReproductionAlgorithm(bugId):
    logging.info(f"Starting bug reproduction for bug id {bugId}")

    bug = BugModel.objects(id=bugId).first()
    run = TestingRun.objects(id=bug.testingRunId).first()

    configData = loadCloudConfiguration()

    try:
        config = run.configuration.createKwolaCoreConfiguration(run.owner, run.applicationId, run.id)

        config['web_session_height'] = {
            "desktop": 768,
            "tablet": 1024,
            "mobile": 740
          }

        config['web_session_width'] = {
            "desktop": 1024,
            "tablet": 800,
            "mobile": 460
          }

        reproducer = BugReproducer(config)

        success, shortestActionSequence = reproducer.findShortestPathReproduction(bug)
        logging.info(f"Reproduction success: {success}")

        if success:
            executionSession = ExecutionSession(
                id=str(bug.id) + "_reproduction",
                owner=bug.owner,
                status="running",
                testingStepId=bug.testingStepId,
                testingRunId=bug.testingRunId,
                applicationId=bug.applicationId,
                startTime=datetime.now(),
                endTime=None,
                tabNumber=0,
                executionTraces=[],
                browser=bug.browser,
                windowSize=bug.windowSize
            )

            environment = WebEnvironment(config=config,
                                         sessionLimit=1,
                                         executionSessions=[executionSession],
                                         plugins=[],
                                         browser=bug.browser,
                                         windowSize=bug.windowSize)


            newActions = []

            for action in shortestActionSequence:
                modifiedAction = reproducer.createReproductionActionFromOriginal(action, environment.getActionMaps()[0])
                newActions.append(modifiedAction)
                trace = environment.runActions([modifiedAction])[0]
                trace.saveToDisk(config)
                executionSession.executionTraces.append(str(trace.id))

            environment.runSessionCompletedHooks()

            moviePlugin = [plugin for plugin in environment.plugins if isinstance(plugin, RecordScreenshots)][0]
            localVideoPath = moviePlugin.movieFilePath(executionSession)

            with open(localVideoPath, 'rb') as f:
                videoData = f.read()


            fileName = f'{str(executionSession.id)}.mp4'
            config.saveKwolaFileData("videos", fileName, videoData)
            config.saveKwolaFileData("bugs", bug.id + ".mp4",  videoData)

            bug.executionSessionId = executionSession.id
            bug.stepNumber = len(shortestActionSequence) - 1
            bug.actionsPerformed = shortestActionSequence
            bug.reproducible = True
            executionSession.saveToDisk(config)
            bug.saveToDisk(config)

            bugObjectPlugin = CreateCloudBugObjects(config)
            bugObjectPlugin.generateVideoFilesForBugs([bug])
            bugObjectPlugin.generateFrameSpriteSheetsForBugs([bug])

        application = ApplicationModel.objects(id=bug.applicationId).limit(1).first()
        if application.enableEmailNewBugNotifications and bug.isBugNew:
            # sendBugFoundNotification(application, bug)
            pass

        if application.enableSlackNewBugNotifications and bug.isBugNew:
            postToCustomerSlack(
                f"A new error has been found. View the bug here: {configData['frontend']['url']}app/dashboard/bugs/{bug.id}",
                application,
                bug.error.message
            )

        if application.enablePushBugsToJIRA and bug.isBugNew:
            postBugToCustomerJIRA(bug, application)

        if application.bugFoundWebhookURL:
            sendCustomerWebhook(application, "bugFoundWebhookURL", json.loads(bug.to_json()))

        logging.info(f"Finished bug reproduction for bug {bugId}")

        return {"success": True}
    except Exception as e:
        errorMessage = f"{traceback.format_exc()}"
        logging.error(f"{errorMessage}")
        return {"success": False, "exception": errorMessage}



if __name__ == "__main__":
    task = KubernetesJobProcess(runBugReproductionAlgorithm)
    task.run()


