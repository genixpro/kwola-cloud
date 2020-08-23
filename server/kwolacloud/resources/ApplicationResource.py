#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..app import cache

from ..datamodels.ApplicationModel import ApplicationModel
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.TrainingStepModel import TrainingStep
from kwola.datamodels.BugModel import BugModel
from ..datamodels.TestingRun import TestingRun

import json
import flask
from ..datamodels.id_utility import generateKwolaId
from ..config.config import getKwolaConfiguration
from ..auth import authenticate, isAdmin
from ..helpers.slack import postToKwolaSlack
import logging

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
            id=generateKwolaId(modelClass=ApplicationModel, kwolaConfig=getKwolaConfiguration(), owner=user)
        )

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
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('name', help='This field cannot be blank', required=True)
        self.postParser.add_argument('url', help='This field cannot be blank', required=True)

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

    def put(self):
        user = authenticate()
        if user is None:
            abort(401)

        data = self.postParser.parse_args()

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            application.modify(**data)
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

