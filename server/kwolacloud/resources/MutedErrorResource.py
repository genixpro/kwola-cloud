#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration
from ..config.config import loadCloudConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.MutedError import MutedError
from ..datamodels.ApplicationModel import ApplicationModel
from flask_restful import Resource, reqparse, abort
import flask
import json


class MutedErrorsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

        self.configData = loadCloudConfiguration()

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

        mutedErrors = MutedError.objects(**queryParams).no_dereference().order_by("-creationDate").to_json()

        return {"mutedErrors": json.loads(mutedErrors)}

    def post(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            return abort(401)

        data = flask.request.get_json()

        data['owner'] = user

        data['id'] = generateKwolaId(modelClass=MutedError, kwolaConfig=getKwolaConfiguration(), owner=user)
        newMutedError = MutedError(**data)
        newMutedError.save()

        return {"mutedErrorId": data['id']}


class MutedErrorsSingle(Resource):
    def get(self, muted_error_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": muted_error_id}

        mutedError = MutedError.objects(**queryParams).first()

        if mutedError is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, mutedError.applicationId):
            return abort(403)

        return {"mutedError": json.loads(mutedError.to_json())}

    def delete(self, muted_error_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": muted_error_id}

        configData = loadCloudConfiguration()
        if not configData['features']['enableDataDeletion']:
            return

        mutedError = MutedError.objects(**queryParams).first()

        if mutedError is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, mutedError.applicationId):
            return abort(403)

        mutedError.delete()

        return {}

