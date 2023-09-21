#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

import flask
from flask_restful import Resource, reqparse
from ..helpers.auth0 import getAccessTokenForTestingUser


class AutologinForSelfTest(Resource):
    def get(self):
        token = getAccessTokenForTestingUser()


        return {
            "accessToken": token['access_token'],
            "idToken": token['id_token'],
            "expiresIn": token['expires_in']
        }
