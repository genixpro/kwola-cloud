#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..app import cache
from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration, loadCloudConfiguration
from ..tasks.RunTesting import runTesting
from flask_jwt_extended import (create_access_token, create_refresh_token, jwt_required,
                                jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from flask_restful import Resource, reqparse, abort
from google.cloud import storage
from kwola.config.config import getSharedGCSStorageClient
from kwola.config.config import KwolaCoreConfiguration
from kwola.datamodels.ResourceModel import Resource as ResourceModel
from kwolacloud.datamodels.TestingRun import TestingRun
from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from kwola.datamodels.ResourceVersionModel import ResourceVersion as ResourceVersionModel
from kwola.datamodels.CustomIDField import CustomIDField
import bson
import flask
import flask
import google.cloud.exceptions
import json
import logging
import os.path

class ResourceVersionsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('resourcesFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)
        pass

    def get(self):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}

        applicationId = flask.request.args.get('applicationId')
        if applicationId is None:
            return abort(400)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, applicationId):
            return abort(403)

        queryParams['applicationId'] = applicationId

        resourceId = flask.request.args.get('resourceId')
        if resourceId is not None:
            queryParams["resourceId"] = resourceId

        resourceVersions = ResourceVersionModel.objects(**queryParams).order_by("-creationDate").limit(5).no_dereference()

        return {"resourceVersions": [version.unencryptedJSON() for version in resourceVersions]}



class ResourceVersionsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def get(self, resource_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": resource_id}

        resourceVersion = ResourceVersionModel.objects(**queryParams).first()

        if resourceVersion is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, resourceVersion.applicationId):
            return abort(403)

        return {"resourceVersion": resourceVersion.unencryptedJSON()}


class ResourceVersionsDownloadOriginalData(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def get(self, resource_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": resource_id}

        resourceVersion = ResourceVersionModel.objects(**queryParams).first()

        if resourceVersion is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, resourceVersion.applicationId):
            return abort(403)

        application = ApplicationModel.objects(id=resourceVersion.applicationId).first()
        config = application.defaultRunConfiguration.createKwolaCoreConfiguration(application.owner, application.id, None)

        data = resourceVersion.loadOriginalResourceContents(config)

        if data is not None:
            response = flask.make_response(data)
            response.headers['content-type'] = resourceVersion.contentType

            return response
        else:
            return abort(404)


class ResourceVersionsDownloadTranslatedData(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def get(self, resource_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": resource_id}

        resourceVersion = ResourceVersionModel.objects(**queryParams).first()

        if resourceVersion is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, resourceVersion.applicationId):
            return abort(403)

        application = ApplicationModel.objects(id=resourceVersion.applicationId).first()
        config = application.defaultRunConfiguration.createKwolaCoreConfiguration(application.owner, application.id, None)

        data = resourceVersion.loadTranslatedResourceContents(config)

        if data is not None:
            response = flask.make_response(data)
            response.headers['content-type'] = resourceVersion.contentType

            return response
        else:
            return abort(404)

