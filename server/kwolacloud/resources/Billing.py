#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
import subprocess
import json
import os
import stripe
import stripe.error
from ..auth import authenticate, isAdmin
from ..config.config import loadConfiguration

class BillingURLResource(Resource):
    def __init__(self):
        pass

    def get(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            abort(401)

        stripeCustomerId = claims['https://kwola.io/stripeCustomerId']

        try:
            session = stripe.billing_portal.Session.create(customer=stripeCustomerId)
        except stripe.error.InvalidRequestError:
            # Customer doesn't exist. Return 400
            return abort(400)

        return {"url": str(session.url)}

