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
from ..datamodels.MutedError import MutedError
from ..helpers.slack import postToKwolaSlack
from ..helpers.email import sendStartTestingRunEmail
from ..tasks.RunTesting import runTesting
from flask_jwt_extended import (create_access_token, create_refresh_token, jwt_required, jwt_refresh_token_required,
                                get_jwt_identity, get_raw_jwt)
from flask_restful import Resource, reqparse, abort
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
import bson
import base64
import datetime
import flask
import json
import os
import stripe
import logging


class MutedErrorsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

        self.configData = loadConfiguration()

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
        if not isAdmin():
            queryParams['owner'] = user

        mutedError = MutedError.objects(**queryParams).first()

        if mutedError is None:
            return abort(404)

        return {"mutedError": json.loads(mutedError.to_json())}

    def delete(self, muted_error_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": muted_error_id}
        if not isAdmin():
            queryParams['owner'] = user

        mutedError = MutedError.objects(**queryParams).first()

        if mutedError is None:
            return abort(404)

        mutedError.delete()

        return {}

