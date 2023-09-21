#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

import flask
from flask_restful import Resource, reqparse

class StripeWebhook(Resource):
    def post(self):
        data = flask.request.get_json()

        return {}


