#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
import subprocess
import json
import os
import stripe
from ..auth import authenticate, isAdmin
from ..config.config import loadConfiguration
import flask

class PromoCodes(Resource):
    def __init__(self):
        pass

    def get(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            abort(401)

        # stripeCustomerId = claims['https://kwola.io/stripeCustomerId']

        code = flask.request.args.get('code')

        if code:
            promoCodes = stripe.PromotionCode.list(active=True, limit=1, code=code)
        else:
            promoCodes = []

        return {"promoCodes": [code.to_dict() for code in promoCodes]}

