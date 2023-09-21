#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from ..auth import authenticate
from ..helpers.slack import postToKwolaSlack
from flask_restful import Resource, reqparse, abort
import flask
from kwolacloud.config.config import loadCloudConfiguration
from ..helpers.auth0 import getUserProfileFromId


class InternalSlackNotification(Resource):
    def __init__(self):
        self.configData = loadCloudConfiguration()

    def post(self):
        userId, claims = authenticate(returnAllClaims=True)
        if userId is None:
            abort(401)

        data = flask.request.get_json()

        message = data['message']
        email = getUserProfileFromId(userId)['email']

        if 'kwola.io' not in email:
            postToKwolaSlack(f"{email}: {message}", error=False)


