#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..app import cache
from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration
from ..datamodels.ApplicationModel import ApplicationModel
from ..datamodels.id_utility import generateKwolaId
from ..helpers.auth0 import updateUserProfileMetadataValue
from ..helpers.slack import postToKwolaSlack, postToCustomerSlack
from ..helpers.webhook import sendCustomerWebhook
from datetime import datetime
from flask_restful import Resource, reqparse, abort
from pprint import pprint
import flask
import json
import logging
import requests


class ApplicationGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('name', help='This field cannot be blank', required=True)
        self.postParser.add_argument('url', help='This field cannot be blank', required=True)

    def get(self):
        user = authenticate()
        if user is None:
            abort(401)

        query = {}
        if not isAdmin():
            query['owner'] = user

        applications = ApplicationModel.objects(**query).no_dereference().to_json()

        return {"applications": json.loads(applications)}

    def post(self):
        user = authenticate()
        if user is None:
            abort(401)

        data = self.postParser.parse_args()


        newApplication = ApplicationModel(
            name=data['name'],
            url=data['url'],
            owner=user,
            id=generateKwolaId(modelClass=ApplicationModel, kwolaConfig=getKwolaConfiguration(), owner=user),
            creationDate=datetime.now()
        )

        newApplication.generateWebhookSignatureSecret()

        updateUserProfileMetadataValue(user, "hasCreatedFirstApplication", True)

        newApplication.save()

        postToKwolaSlack(f"New application was created on url {data['url']}")

        return {"applicationId": str(newApplication.id)}

        # if not current_user:
        #     return {'message': 'User {} doesn\'t exist'.format(data['username'])}
        #
        # if data['username'] == current_user['username'] and data['password'] == current_user['password']:
        #     access_token = create_access_token(identity=data['username'])
        #     return {
        #         'token': access_token,
        #     }
        # else:
        #     return {'message': 'Wrong credentials'}


class ApplicationSingle(Resource):
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
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        data = flask.request.get_json()

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
                'bugFoundWebhookURL'
            ]
            for key, value in data.items():
                if key in allowedEditFields:
                    if getattr(application, key) != value:
                        setattr(application, key, value)

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
            ApplicationModel.objects(**query).delete()
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

