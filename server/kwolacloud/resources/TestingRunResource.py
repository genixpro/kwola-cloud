#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..auth import authenticate, isAdmin
from kwolacloud.components.utils.KubernetesJob import KubernetesJob
from ..config.config import getKwolaConfiguration
from ..config.config import loadCloudConfiguration
from ..datamodels.ApplicationModel import ApplicationModel
from ..datamodels.id_utility import generateKwolaId
import random
from ..datamodels.TestingRun import TestingRun
from ..helpers.slack import postToKwolaSlack
from ..helpers.email import sendStartTestingRunEmail
from flask_restful import Resource, reqparse, abort
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
import datetime
from dateutil.relativedelta import relativedelta
import flask
import json
import math
import concurrent.futures
import stripe
import os
from google.cloud import storage
import google.cloud.exceptions
from kwola.config.config import getSharedGCSStorageClient
from ..helpers.stripe import getPriceIdForUser
from ..components.managers.TestingRunManager import TestingRunManager


class TestingRunsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)

        self.configData = loadCloudConfiguration()

    def get(self):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {}

        if not isAdmin():
            queryParams['owner'] = userId


        applicationId = flask.request.args.get('applicationId')
        if applicationId is not None:
            queryParams["applicationId"] = applicationId

        recurringTestingTriggerId = flask.request.args.get('recurringTestingTriggerId')
        if recurringTestingTriggerId is not None:
            queryParams["recurringTestingTriggerId"] = recurringTestingTriggerId

        testingRuns = TestingRun.objects(**queryParams).no_dereference().order_by("-startTime").limit(100).to_json()

        return {"testingRuns": json.loads(testingRuns)}

    def post(self):
        userId, claims = authenticate(returnAllClaims=True)
        if userId is None:
            return abort(401)

        data = flask.request.get_json()

        query = {"id": data['applicationId']}
        if not isAdmin():
            query['owner'] = userId

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is None:
            return abort(400)

        if not application.checkSubscriptionLaunchRunAllowed():
            return abort(400)

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']
        allowFreeRuns = claims['https://kwola.io/freeRuns']

        newTestingRun = TestingRun(
            id=generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=application.owner),
            owner=application.owner,
            applicationId=application.id,
            stripeSubscriptionId=application.stripeSubscriptionId,
            promoCode=application.promoCode,
            status="created",
            startTime=datetime.datetime.now(),
            predictedEndTime=(datetime.datetime.now() + relativedelta(hours=(application.defaultRunConfiguration.hours + 1), minute=30, second=0, microsecond=0)),
            recurringTestingTriggerId=None,
            isRecurring=False,
            configuration=application.defaultRunConfiguration,
            launchSource="manual"
        )

        newTestingRun.save()

        postToKwolaSlack(f"New testing run was started with id {newTestingRun.id} for application {data['applicationId']} and user {claims['name']} [{claims['email']}]", error=False)

        if application.enableEmailNewTestingRunNotifications:
            sendStartTestingRunEmail(application)

        newTestingRun.runJob()

        if application.package == "monthly" and application.countTestingRunsLaunchedThisMonth() > 5 and application.stripeSubscriptionId is not None:
            priceId = getPriceIdForUser(userId, 'monthlyExtraPriceId')

            stripe.InvoiceItem.create(
                customer=stripeCustomerId,
                price=priceId,
                subscription=application.stripeSubscriptionId
            )

        return {"testingRunId": newTestingRun.id}


class TestingRunsSingle(Resource):
    def get(self, testing_run_id):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = userId

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        return {"testingRun": json.loads(testingRun.to_json())}


class TestingRunsRestart(Resource):
    def post(self, testing_run_id):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = userId

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        testingRun.runJob()

        return {}


class TestingRunsRestartTraining(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)

        self.configData = loadCloudConfiguration()

    def post(self, testing_run_id):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = userId

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        if self.configData['features']['localRuns']:
            currentTrainingStepJob = ManagedTaskSubprocess(
                ["python3", "-m", "kwolacloud.tasks.SingleTrainingStepTaskLocal"], {
                    "testingRunId": testingRun.id,
                    "trainingStepsCompleted": 0
                }, timeout=7200, config=getKwolaConfiguration(), logId=None)
        else:
            currentTrainingStepJob = KubernetesJob(module="kwolacloud.tasks.SingleTrainingStepTask",
                                                   data={
                                                       "testingRunId": testingRun.id,
                                                       "trainingStepsCompleted": 0
                                                   },
                                                   referenceId=f"{testingRun.id}-trainingstep-{''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for n in range(5))}",
                                                   image="worker",
                                                   cpuRequest="7000m",
                                                   cpuLimit=None,
                                                   memoryRequest="34.0Gi",
                                                   memoryLimit=None,
                                                   gpu=True
                                                   )
        currentTrainingStepJob.start()

        return {}


class TestingRunsDownloadZip(Resource):
    def __init__(self):
        self.configData = loadCloudConfiguration()

    def get(self, testing_run_id):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = userId

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        try:
            storageClient = getSharedGCSStorageClient()
            applicationStorageBucket = storage.Bucket(storageClient, "kwola-testing-run-data-" + testingRun.applicationId)
            objectPath = f"bug_zip_files/{testingRun.id}.zip"
            objectBlob = storage.Blob(objectPath, applicationStorageBucket)

            zipData = objectBlob.download_as_string()

            response = flask.make_response(zipData)
            response.headers['content-type'] = 'application/zip'
            response.headers['content-disposition'] = f'attachment; filename="{testingRun.id}.zip"'

            return response
        except google.cloud.exceptions.NotFound:
            abort(404)


class PauseTestingRun(Resource):
    def __init__(self):
        self.configData = loadCloudConfiguration()

    def post(self, testing_run_id):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = userId

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        if testingRun.status != "running":
            return abort(400)

        configData = loadCloudConfiguration()

        with concurrent.futures.ThreadPoolExecutor() as executor:
            mainJob = testingRun.createKubernetesJobObject()
            if not configData['features']['localRuns'] and mainJob.doesJobStillExist():
                executor.submit(mainJob.cleanup)

            for jobId in testingRun.runningTestingStepJobIds:
                testStepJob = KubernetesJob(module="kwolacloud.tasks.SingleTestingStepTask",
                                            data={},
                                            referenceId=jobId)

                if not configData['features']['localRuns'] and testStepJob.doesJobStillExist():
                    executor.submit(testStepJob.cleanup)

            testingRun.runningTestingStepJobIds = []
            testingRun.runningTestingStepStartTimes = []

            for jobId in testingRun.runningBugReproductionJobIds.values():
                bugReproductionJob = KubernetesJob(module="kwolacloud.tasks.BugReproductionTask",
                                            data={},
                                            referenceId=jobId)

                if not configData['features']['localRuns'] and bugReproductionJob.doesJobStillExist():
                    executor.submit(bugReproductionJob.cleanup)

            if testingRun.runningTrainingStepJobId is not None:
                trainingJob = KubernetesJob(module="kwolacloud.tasks.SingleTrainingStepTask",
                                            data={},
                                            referenceId=testingRun.runningTrainingStepJobId)
                if not configData['features']['localRuns'] and trainingJob.doesJobStillExist():
                    executor.submit(trainingJob.cleanup)

        testingRun.runningTrainingStepJobId = None
        testingRun.runningTrainingStepStartTime = None
        testingRun.status = "paused"
        testingRun.save()

        return {}


class ResumeTestingRun(Resource):
    def __init__(self):
        self.configData = loadCloudConfiguration()

    def post(self, testing_run_id):
        userId = authenticate()
        if userId is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = userId

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        if testingRun.status != "paused":
            return abort(400)

        testingRun.status = "running"

        portionComplete = testingRun.testingSessionsCompleted / testingRun.configuration.totalTestingSessions
        testingRun.predictedEndTime = datetime.datetime.now() + relativedelta(hours=int(math.ceil(testingRun.configuration.hours * (1.0 - portionComplete))) + 1,
                                                                              minute=30,
                                                                              second=0,
                                                                              microsecond=0)

        testingRun.save()
        testingRun.runJob()

        return {}
