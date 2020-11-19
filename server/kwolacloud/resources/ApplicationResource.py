#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..app import cache
from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration
from ..datamodels.ApplicationModel import ApplicationModel
from ..datamodels.TestingRun import TestingRun
from ..datamodels.RunConfiguration import RunConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..helpers.auth0 import updateUserProfileMetadataValue
from ..helpers.slack import postToKwolaSlack, postToCustomerSlack
from ..helpers.webhook import sendCustomerWebhook
from ..datamodels.RecurringTestingTrigger import RecurringTestingTrigger
from datetime import datetime
from flask_restful import Resource, reqparse, abort
from flask import jsonify
from pprint import pprint
from dateutil.relativedelta import relativedelta
from ..config.config import loadConfiguration
import flask
import json
import stripe
import stripe.error
import logging
import copy
import requests
from mongoengine.queryset.visitor import Q
import selenium
import time
from selenium import webdriver
from selenium.webdriver.common.proxy import Proxy, ProxyType
from selenium.webdriver.chrome.options import Options
import selenium.common.exceptions
from google.cloud import storage
import hashlib
import cv2
import numpy
from ..helpers.auth0 import getUserProfileFromId
from ..helpers.stripe import attachPaymentMethodToUserAccountIfNeeded


class ApplicationGroup(Resource):
    def __init__(self):
        self.configData = loadConfiguration()

    def get(self):
        user = authenticate()
        if user is None:
            abort(401)

        query = {}
        if not isAdmin():
            query['owner'] = user

        applications = ApplicationModel.objects(Q(status__exists=False) | Q(status="active"), **query).no_dereference().to_json()

        return {"applications": json.loads(applications)}

    def post(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            abort(401)

        data = flask.request.get_json()

        runConfiguration = RunConfiguration(**data['defaultRunConfiguration'])

        newApplication = ApplicationModel(
            name=data['name'],
            url=data['url'],
            owner=user,
            id=generateKwolaId(modelClass=ApplicationModel, kwolaConfig=getKwolaConfiguration(), owner=user),
            creationDate=datetime.now(),
            defaultRunConfiguration=runConfiguration,
            package=data['package'],
            promoCode=data.get('promoCode')
        )

        newApplication.defaultRunConfiguration.testingSequenceLength = 100
        newApplication.defaultRunConfiguration.totalTestingSessions = 1000
        newApplication.defaultRunConfiguration.hours = 6

        newApplication.generateWebhookSignatureSecret()

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
        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']
        allowFreeRuns = claims['https://kwola.io/freeRuns']

        if allowFreeRuns:
            newApplication.stripeSubscriptionId = None
        elif newApplication.package == "monthly":
            customer = stripe.Customer.retrieve(stripeCustomerId)

            attachPaymentMethodToUserAccountIfNeeded(data['billingPaymentMethod'], stripeCustomerId)

            priceId = self.configData['stripe']['monthlyPriceId']

            # Update this to the new product with price attached
            subscription = stripe.Subscription.create(
                customer=customer.id,
                items=[{'price': priceId}],
                coupon=coupon,
                expand=['latest_invoice.payment_intent'],
            )

            if subscription.status != "active":
                return abort(400)

            newApplication.stripeSubscriptionId = subscription.id
        elif newApplication.package == "once":
            customer = stripe.Customer.retrieve(stripeCustomerId)

            attachPaymentMethodToUserAccountIfNeeded(data['billingPaymentMethod'], stripeCustomerId)

            invoiceItem = stripe.InvoiceItem.create(
                customer=customer.id,
                price=self.configData['stripe']['oneOffRunPriceId']
            )

            invoice = stripe.Invoice.create(
                customer=customer.id
            )

            try:
                stripe.Invoice.pay(invoice.id)
            except stripe.error.InvalidRequestError:
                pass

            newApplication.stripeSubscriptionId = None

        newApplication.save()

        runConfiguration = copy.deepcopy(newApplication.defaultRunConfiguration)

        if newApplication.package == "monthly":
            runConfiguration.testingSequenceLength = 100
            runConfiguration.totalTestingSessions = 5000
            runConfiguration.hours = 36
            launchSource = "initial_training"
        else:
            runConfiguration.testingSequenceLength = 100
            runConfiguration.totalTestingSessions = 3500
            runConfiguration.hours = 18
            launchSource = "one_off"

        newTestingRun = TestingRun(
            id=generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=user),
            owner=user,
            applicationId=newApplication.id,
            stripeSubscriptionId=newApplication.stripeSubscriptionId,
            promoCode=newApplication.promoCode,
            status="created",
            startTime=datetime.now(),
            predictedEndTime=(datetime.now() + relativedelta(hours=(runConfiguration.hours + 1), minute=30, second=0, microsecond=0)),
            recurringTestingTriggerId=None,
            isRecurring=False,
            configuration=runConfiguration,
            launchSource=launchSource
        )

        newTestingRun.save()

        newTestingRun.runJob()

        if newApplication.package == "monthly":
            if data['launchMethod'] == 'weekly' or data['launchMethod'] == "date_of_month":
                newTrigger = RecurringTestingTrigger(
                    id=generateKwolaId(modelClass=RecurringTestingTrigger, kwolaConfig=getKwolaConfiguration(), owner=newApplication.owner),
                    owner=newApplication.owner,
                    creationTime=datetime.now(),
                    applicationId=newApplication.id,
                    stripeSubscriptionId=newApplication.stripeSubscriptionId,
                    promoCode=newApplication.promoCode
                )

                newTrigger.repeatTrigger = "time"
                if data['launchMethod'] == 'weekly':
                    newTrigger.repeatUnit = "weeks"
                    newTrigger.repeatFrequency = 1
                    newTrigger.hourOfDay = data['hourOfDay']
                    newTrigger.daysOfWeekEnabled = {
                        str(day): True if data['dayOfWeek'] == day else False
                        for day in range(7)
                    }
                elif data['launchMethod'] == 'date_of_month':
                    newTrigger.repeatUnit = "months_by_date"
                    newTrigger.repeatFrequency = 1
                    newTrigger.hourOfDay = data['hourOfDay']
                    newTrigger.datesOfMonthEnabled = data['datesOfMonth']

                newTrigger.save()

        email = getUserProfileFromId(user)['email']
        postToKwolaSlack(f"New application was created by user {email} on url {data['url']} with package {data['package']}", error=False)

        updateUserProfileMetadataValue(user, "hasCreatedFirstApplication", True)

        return {
            "applicationId": str(newApplication.id),
            "testingRunId": str(newTestingRun.id)
        }



class ApplicationSingle(Resource):
    def __init__(self):
        self.configData = loadConfiguration()

    def get(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            return json.loads(application.to_json())
        else:
            abort(404)

    def post(self, application_id):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        data = flask.request.get_json()

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']
        allowFreeRuns = claims['https://kwola.io/freeRuns']

        if application is not None:
            allowedEditFields = [
                'name',
                'url',
                'slackAccessToken',
                'slackChannel',
                'enableSlackNewTestingRunNotifications',
                'enableSlackNewBugNotifications',
                'enableSlackTestingRunCompletedNotifications',
                'overrideNotificationEmail',
                'enableEmailNewTestingRunNotifications',
                'enableEmailNewBugNotifications',
                'enableEmailTestingRunCompletedNotifications',
                'jiraAccessToken',
                'jiraCloudId',
                'jiraProject',
                'jiraIssueType',
                'enablePushBugsToJIRA',
                'testingRunStartedWebhookURL',
                'testingRunFinishedWebhookURL',
                'browserSessionWillStartWebhookURL',
                'browserSessionFinishedWebhookURL',
                'bugFoundWebhookURL',
                'defaultRunConfiguration'
            ]
            for key, value in data.items():
                if key in allowedEditFields:
                    if getattr(application, key) != value:
                        if key == 'defaultRunConfiguration':
                            setattr(application, key, RunConfiguration(**value))
                        else:
                            setattr(application, key, value)

            if 'package' in data and data['package'] != application.package:
                if application.package == "monthly":
                    if application.stripeSubscriptionId is not None:
                        stripe.Subscription.delete(application.stripeSubscriptionId)
                        application.stripeSubscriptionId = None
                    application.package = None

                if data['package'] == 'monthly':
                    if not allowFreeRuns:
                        priceId = self.configData['stripe']['monthlyPriceId']

                        # Update this to the new product with price attached
                        subscription = stripe.Subscription.create(
                            customer=stripeCustomerId,
                            items=[{'price': priceId}],
                            coupon=None
                        )

                        application.stripeSubscriptionId = subscription.id
                    else:
                        application.stripeSubscriptionId = None

                    application.package = data['package']
                elif data['package'] is None:
                    email = getUserProfileFromId(user)['email']
                    postToKwolaSlack(f"User {email} has unsubscribed.", error=False)

            application.save()
            return ""
        else:
            abort(404)

    def delete(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            application.status = "deleted"
            application.save()
        else:
            abort(404)


class ApplicationImage(Resource):
    @cache.cached(timeout=36000)
    def get(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        screenshotData = application.fetchScreenshot()

        response = flask.make_response(screenshotData)
        response.headers['content-type'] = 'image/png'
        return response


class ApplicationSubscribeToSlack(Resource):
    def get(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            if application.slackAccessToken is None:
                return {"channels": []}

            headers = {
                "Authorization": f"Bearer {application.slackAccessToken}"
            }

            response = requests.get("https://slack.com/api/conversations.list", headers=headers)

            if response.status_code != 200:
                abort(500)
                return
            else:
                return {
                    "channels": [channelData['name'] for channelData in response.json()['channels']]
                }
        else:
            abort(404)



    def post(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            data = flask.request.get_json()

            response = requests.post("https://slack.com/api/oauth.v2.access", {
                "code": data['code'],
                "redirect_uri": data['redirect_uri']
            }, auth=("1312504467012.1339775540961", '7ae3238eabf14c0b8fd4c96954de01e6'))

            if response.status_code != 200:
                abort(400)
            else:
                if 'access_token' in response.json():
                    application.slackAccessToken = response.json()['access_token']
                    application.slackChannel = None
                    application.save()
                    return ""
                else:
                    return abort(400)
        else:
            abort(404)


class ApplicationTestSlack(Resource):
    def post(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            postToCustomerSlack("Hooray! Kwola has been successfully connected to your Slack workspace.", application)

            return {}
        else:
            abort(404)



class ApplicationIntegrateWithJIRA(Resource):
    def get(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            responseData = {
                "projects": [],
                "issueTypes": []
            }

            if application.jiraRefreshToken is None:
                return responseData

            refreshTokenSuccess = application.refreshJiraAccessToken()
            if not refreshTokenSuccess:
                abort(500)
                return

            headers = {
                "Authorization": f"Bearer {application.jiraAccessToken}",
                "Content-Type": "application/json"
            }

            jiraAPIResponse = requests.get(f"https://api.atlassian.com/ex/jira/{application.jiraCloudId}/rest/api/3/project/search", headers=headers)
            if jiraAPIResponse.status_code != 200:
                logging.error(jiraAPIResponse.text)
                abort(500)
                return
            else:
                responseData['projects'] = jiraAPIResponse.json()['values']

            if application.jiraProject:
                jiraAPIResponse = requests.get(f"https://api.atlassian.com/ex/jira/{application.jiraCloudId}/rest/api/2/issuetype", headers=headers)
                if jiraAPIResponse.status_code != 200:
                    logging.error("Error fetching issue types for JIRA project.", jiraAPIResponse.text)
                    abort(500)
                    return
                else:
                    responseData['issueTypes'] = [
                        issueType
                        for issueType in jiraAPIResponse.json()
                        if ('scope' in issueType and 'project' in issueType['scope'] and issueType['scope']['project']['id'] == application.jiraProject)
                    ]

                    if len(responseData['issueTypes']) == 0:
                        responseData['issueTypes'] = [
                            issueType
                            for issueType in jiraAPIResponse.json()
                            if 'scope' not in issueType or 'project' not in issueType['scope']
                        ]

            return responseData
        else:
            abort(404)



    def post(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            data = flask.request.get_json()

            response = requests.post("https://auth.atlassian.com/oauth/token", {
                "code": data['code'],
                "redirect_uri": data['redirect_uri'],
                "grant_type": "authorization_code",
                "client_id": "V5H8QVarAt0oytdolmjMzoIIrmRc1i41",
                "client_secret": "rNzHZLKqiB1DNp0Mv3bw7nQ_DngMepAt6vTViWJEA6ekf1f904whaWPNxhR0C3Ji"
            })

            if response.status_code != 200:
                abort(400)
            else:
                if 'access_token' in response.json() and 'refresh_token' in response.json():
                    application.jiraAccessToken = response.json()['access_token']
                    application.jiraRefreshToken = response.json()['refresh_token']

                    headers = {
                        "Authorization": f"Bearer {application.jiraAccessToken}"
                    }

                    response = requests.get("https://api.atlassian.com/oauth/token/accessible-resources", headers=headers)

                    if response.status_code != 200:
                        return abort(500)

                    application.jiraCloudId = response.json()[0]['id']

                    application.save()
                else:
                    return abort(400)
            return ""
        else:
            abort(404)



class ApplicationTestWebhook(Resource):
    def post(self, application_id, webhook_field):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        validWebhooksFields = [
            'testingRunStartedWebhookURL',
            'testingRunFinishedWebhookURL',
            'browserSessionWillStartWebhookURL',
            'browserSessionFinishedWebhookURL',
            'bugFoundWebhookURL'
        ]

        if webhook_field not in validWebhooksFields:
            return abort(400)

        if application is not None:
            success = sendCustomerWebhook(application, webhook_field, {
                "applicationId": application.id,
                "info": "This is not meant to be reflective of what the actual webhook objects will look like when Kwola runs. Please provide a status code 200"
                        "for the response, and remember to always validate the hash signature using the SHA256 variant of HMAC."
            }, isTestCall=True)

            return {"success": success}
        else:
            return abort(404)


class NewApplicationTestImage(Resource):
    def get(self):
        user = authenticate()
        if user is None:
            abort(401)

        url = flask.request.args['url']

        urlHash = hashlib.sha256()
        urlHash.update(bytes(url, 'utf8'))
        urlCacheId = "new-application-screenshot-" + urlHash.hexdigest()

        storage_client = storage.Client()

        bucket = storage_client.lookup_bucket("kwola-application-screenshots")
        blob = bucket.blob(urlCacheId)
        if blob.exists():
            screenshotData = blob.download_as_string()
        else:
            chrome_options = Options()
            chrome_options.headless = True

            driver = webdriver.Chrome(chrome_options=chrome_options)
            driver.set_page_load_timeout(20)
            window_size = driver.execute_script("""
                return [window.outerWidth - window.innerWidth + arguments[0],
                  window.outerHeight - window.innerHeight + arguments[1]];
                """, 1024, 768)
            driver.set_window_size(*window_size)
            try:
                driver.get(url)
                time.sleep(1.50)
            except selenium.common.exceptions.TimeoutException:
                pass
            except selenium.common.exceptions.WebDriverException:
                pass
            screenshotData = driver.get_screenshot_as_png()
            driver.quit()

            # Check to see if this screenshot is good. Sometimes due to the timeouts, the image comes up
            # all white. We don't want to store that version in blob storage
            loadedScreenshot = cv2.imdecode(numpy.frombuffer(screenshotData, numpy.uint8), -1)

            colors = set(tuple(color) for row in loadedScreenshot for color in row)

            if len(colors) > 1:
                blob.upload_from_string(screenshotData, content_type="image/png")


        response = flask.make_response(screenshotData)
        response.headers['content-type'] = 'image/png'
        return response


class AttachCardToUser(Resource):
    def __init__(self):
        self.configData = loadConfiguration()

    def post(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            abort(401)

        data = flask.request.get_json()

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']

        try:
            attachPaymentMethodToUserAccountIfNeeded(data['billingPaymentMethod'], stripeCustomerId)
            return {}
        except stripe.error.CardError as e:
            response = jsonify({
                "message": str(e)[str(e).index(":") + 1:]
            })
            response.status_code = 400
            return response
