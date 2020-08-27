#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..app import cache
from ..auth import authenticate, isAdmin
from ..components.KubernetesJob import KubernetesJob
from ..config.config import getKwolaConfiguration
from ..config.config import loadConfiguration
from ..datamodels.ApplicationModel import ApplicationModel
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.TestingRun import TestingRun
from ..helpers.slack import postToKwolaSlack
from ..helpers.email import sendStartTestingRunEmail
from ..tasks.RunTesting import runTesting
from flask_jwt_extended import (create_access_token, create_refresh_token, jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from flask_restful import Resource, reqparse, abort
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
import bson
import base64
import datetime
from dateutil.relativedelta import relativedelta
import flask
import json
import os
import stripe
import logging


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

        #return data;
        #change this for production. using dev user for billing
        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']
        #stripeCustomerId = 'cus_HWGxAP6pB9znK4'

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

            #update this to the new product with price attached
            #subscription = stripe.Subscription.create(
            #    customer=customer.id,
            #    items=[{'price': data['stripe']['priceId']}],
            #    expand=['latest_invoice.payment_intent'],
            #)

            subscription = stripe.InvoiceItem.create(
              customer=customer.id,
              price=data['stripe']['priceId']
            )
            invoiceId = subscription.id

            invoice = stripe.Invoice.create(
                customer=customer.id,
            )
            payment = stripe.Invoice.pay(sid=invoice.id, payment_method=data['payment_method'])
            #return payment;
            
            if payment.paid != True:
                return abort(400)

            del data['payment_method']
            data['stripeSubscriptionId'] = None#subscription.id
        else:
            data['stripeSubscriptionId'] = None

        data['id'] = generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=user)
        data['owner'] = application.owner
        data['status'] = "created"
        data['startTime'] = datetime.datetime.now()
        data['predictedEndTime'] = data['startTime'] + relativedelta(hours=data['configuration']['hours'])
        data['testingSessionsRemaining'] = data['configuration']['totalTestingSessions']

        if 'stripe' in data:
            del data['stripe']
        
        newTestingRun = TestingRun(**data)

        newTestingRun.save()

        postToKwolaSlack(f"New testing run was started with id {data['id']} for application {data['applicationId']}")

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
