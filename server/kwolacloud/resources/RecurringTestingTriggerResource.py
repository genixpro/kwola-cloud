#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
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
from ..datamodels.RecurringTestingTrigger import RecurringTestingTrigger
from flask_restful import Resource, reqparse, abort
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
import datetime
from dateutil.relativedelta import relativedelta
import flask
import logging
import json
import stripe
import os


class RecurringTestingTriggerGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.configData = loadCloudConfiguration()

    def get(self):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}

        if not isAdmin():
            queryParams['owner'] = user

        applicationId = flask.request.args.get('applicationId')
        if applicationId is None:
            return abort(400)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, applicationId):
            return abort(403)

        queryParams['applicationId'] = applicationId

        recurringTestingTriggers = RecurringTestingTrigger.objects(**queryParams).no_dereference().order_by("-creationTime").limit(10)

        return {"recurringTestingTriggers": [trigger.unencryptedJSON() for trigger in recurringTestingTriggers]}

    def post(self):
        logging.info(f"Attempt Stripe verification")
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            return abort(401)

        data = flask.request.get_json()

        query = {"id": data['applicationId']}

        if not ApplicationModel.checkIfUserCanAccessApplication(user, data['applicationId']):
            return abort(403)

        promoCode = None
        coupon = None
        if 'promoCode' in data and data['promoCode']:
            promoCode = data['promoCode']
        else:
            # Temporarily just autofill with a promocode
            promoCode = "BETATRIAL"

        if promoCode:
            codes = stripe.PromotionCode.list(active=True, code=promoCode, limit=1).data
            if len(codes) > 0:
                coupon = codes[0].coupon

        application = ApplicationModel.objects(**query).limit(1).first()

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']

        allowFreeRuns = claims['https://kwola.io/freeRuns']

        if not allowFreeRuns and coupon is None:
            customer = stripe.Customer.retrieve(stripeCustomerId)

            stripe.PaymentMethod.attach(
                data['payment_method'],
                customer=stripeCustomerId,
            )

            # Creating a subscription for this recurring testing trigger
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

        data['id'] = generateKwolaId(modelClass=RecurringTestingTrigger, kwolaConfig=getKwolaConfiguration(), owner=application.owner)
        data['owner'] = application.owner
        data['creationTime'] = datetime.datetime.now()

        if 'stripe' in data:
            del data['stripe']

        newTrigger = RecurringTestingTrigger(**data)
        newTrigger.save()

        postToKwolaSlack(
            f"A new recurring testing trigger was created with id {data['id']} for application {data['applicationId']} and user {claims['name']} [{claims['email']}]", error=False)

        return {"recurringTestingTriggerId": data['id']}


class RecurringTestingTriggerSingle(Resource):
    def get(self, recurring_testing_trigger_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": recurring_testing_trigger_id}

        recurringTestingTrigger = RecurringTestingTrigger.objects(**queryParams).first()

        if recurringTestingTrigger is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, recurringTestingTrigger.applicationId):
            return abort(403)

        return {"recurringTestingTrigger": recurringTestingTrigger.unencryptedJSON()}


    def delete(self, recurring_testing_trigger_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": recurring_testing_trigger_id}

        configData = loadCloudConfiguration()
        if not configData['features']['enableDataDeletion']:
            return

        trigger = RecurringTestingTrigger.objects(**queryParams).first()

        if trigger is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, trigger.applicationId):
            return abort(403)

        trigger.delete()

        return {}

