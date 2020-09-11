#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..auth import authenticate, isAdmin
from kwolacloud.components.utils.KubernetesJob import KubernetesJob
from ..config.config import getKwolaConfiguration
from ..config.config import loadConfiguration
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
import stripe
import os
from ..tasks.utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive


class TestingRunsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)

        self.configData = loadConfiguration()

    def get(self):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}

        if not isAdmin():
            queryParams['owner'] = user


        applicationId = flask.request.args.get('applicationId')
        if applicationId is not None:
            queryParams["applicationId"] = applicationId

        testingRuns = TestingRun.objects(**queryParams).no_dereference().order_by("-startTime").limit(10).to_json()

        return {"testingRuns": json.loads(testingRuns)}

    def post(self):
        #logging.info(f"Attempt Stripe verification")
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            return abort(401)

        data = flask.request.get_json()

        query = {"id": data['applicationId']}
        if not isAdmin():
            query['owner'] = user

        promoCode = None
        coupon = None
        if 'promoCode' in data:
            promoCode = data['promoCode']
        if promoCode:
            codes = stripe.PromotionCode.list(active=True, code=promoCode, limit=1).data
            if len(codes) > 0:
                coupon = codes[0].coupon

        application = ApplicationModel.objects(**query).limit(1).first()

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']

        allowFreeRuns = claims['https://kwola.io/freeRuns']
        

        if not allowFreeRuns and coupon is None:
            customer = stripe.Customer.retrieve(stripeCustomerId)

            if customer is None:
                customer = stripe.Customer.create(
                    payment_method=data['payment_method'],
                    email=claims['email'],
                    name=claims['name']
                )
            else:
                stripe.PaymentMethod.attach(
                  data['payment_method'],
                  customer=stripeCustomerId,
                )

            # Update this to the new product with price attached
            subscription = stripe.Subscription.create(
               customer=customer.id,
               items=[{'plan': self.configData['stripe']['planId']}],
               coupon=coupon,
               expand=['latest_invoice.payment_intent'],
            )

            if subscription.status != "active":
                return abort(400)

            del data['payment_method']
            data['stripeSubscriptionId'] = subscription.id
        else:
            data['stripeSubscriptionId'] = None

        data['id'] = generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=user)
        data['owner'] = application.owner
        data['status'] = "created"
        data['startTime'] = datetime.datetime.now()
        data['predictedEndTime'] = data['startTime'] + relativedelta(hours=data['configuration']['hours'])

        if 'stripe' in data:
            del data['stripe']
        
        newTestingRun = TestingRun(**data)
        newTestingRun.save()

        application.defaultRunConfiguration = newTestingRun.configuration
        application.save()

        postToKwolaSlack(f"New testing run was started with id {data['id']} for application {data['applicationId']} and user {claims['name']} [{claims['email']}]")

        if application.enableEmailNewTestingRunNotifications:
            sendStartTestingRunEmail(application)

        newTestingRun.runJob()

        return {"testingRunId": data['id']}


class TestingRunsSingle(Resource):
    def get(self, testing_run_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = user

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        return {"testingRun": json.loads(testingRun.to_json())}


class TestingRunsRestart(Resource):
    def post(self, testing_run_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = user

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

        self.configData = loadConfiguration()

    def post(self, testing_run_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = user

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
                                                   cpuRequest="6000m",
                                                   cpuLimit=None,
                                                   memoryRequest="12.0Gi",
                                                   memoryLimit=None,
                                                   gpu=True
                                                   )
        currentTrainingStepJob.start()

        return {}


class TestingRunsDownloadZip(Resource):
    def __init__(self):
        self.configData = loadConfiguration()

    def get(self, testing_run_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = user

        testingRun = TestingRun.objects(**queryParams).first()

        if testingRun is None:
            return abort(404)

        if not self.configData['features']['localRuns']:
            configDir = mountTestingRunStorageDrive(testingRun.applicationId)
        else:
            configDir = os.path.join("data", testingRun.applicationId)

        try:
            with open(os.path.join(configDir, "bug_zip_files", testingRun.id + ".zip"), 'rb') as f:
                zipData = f.read()

            response = flask.make_response(zipData)
            response.headers['content-type'] = 'application/zip'
            response.headers['content-disposition'] = f'attachment; filename="{testingRun.id}.zip"'

            return response
        except FileNotFoundError:
            abort(404)
        finally:
            if not self.configData['features']['localRuns']:
                unmountTestingRunStorageDrive(configDir)

