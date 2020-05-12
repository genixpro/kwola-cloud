#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import flask
from flask_restful import Resource, reqparse

class StripeWebhook(Resource):
    def post(self):
        data = flask.request.get_json()

        print(data)

        return {}


