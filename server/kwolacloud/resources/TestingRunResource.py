#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import flask
from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..app import cache
from ..datamodels.TestingRun import TestingRun
from ..tasks.RunTesting import runTesting
import json
import datetime
import bson
from kwola.datamodels.CustomIDField import CustomIDField
from ..datamodels.id_utility import generateKwolaId
from ..config.config import getKwolaConfiguration
import stripe
from ..auth import authenticate, isAdmin
from ..config.config import loadConfiguration
from ..components.KubernetesJob import KubernetesJob


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
            abort(401)

        queryParams = {}

        if not isAdmin():
            queryParams['owner'] = user


        applicationId = flask.request.args.get('applicationId')
        if applicationId is not None:
            queryParams["applicationId"] = applicationId

        testingRuns = TestingRun.objects(**queryParams).no_dereference().order_by("-startTime").limit(10).to_json()

        return {"testingRuns": json.loads(testingRuns)}

    def post(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            abort(401)

        data = flask.request.get_json()

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']
        allowFreeRuns = claims['https://kwola.io/freeRuns']

        if not allowFreeRuns:
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

            subscription = stripe.Subscription.create(
                customer=customer.id,
                items=[{'plan': self.configData['stripe']['planId']}],
                expand=['latest_invoice.payment_intent'],
            )

            if subscription.status != "active":
                abort(400)

            del data['payment_method']
            data['stripeSubscriptionId'] = subscription.id
        else:
            data['stripeSubscriptionId'] = None

        data['id'] = generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=user)
        data['owner'] = user
        data['status'] = "created"
        data['startTime'] = datetime.datetime.now()
        data['testingSessionsRemaining'] = data['configuration']['totalTestingSessions']

        newTestingRun = TestingRun(**data)

        newTestingRun.save()

        job = KubernetesJob(module="kwolacloud.tasks.RunTesting",
                            data={
                                "testingRunId": data['id']
                            },
                            referenceId=data['id'],
                            image="worker",
                            cpuRequest="100m",
                            cpuLimit=None,
                            memoryRequest="350Mi",
                            memoryLimit="512Mi"
                            )
        job.start()

        return {"testingRunId": data['id']}


class TestingRunsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, testing_run_id):
        user = authenticate()
        if user is None:
            abort(401)

        queryParams = {"id": testing_run_id}
        if not isAdmin():
            queryParams['owner'] = user

        testingRun = TestingRun.objects(**queryParams).limit(1)[0].to_json()

        return {"testingRun": json.loads(testingRun)}
