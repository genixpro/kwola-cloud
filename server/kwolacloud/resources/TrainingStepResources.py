#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from ..app import cache
from kwola.datamodels.TrainingStepModel import TrainingStep
import json
import math
from ..auth import authenticate, isAdmin
import logging


class TrainingStepGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)

    def get(self):
        user = authenticate()
        if user is None:
            abort(401)

        queryParams = {}
        if not isAdmin():
            queryParams['owner'] = user

        trainingSteps = TrainingStep.objects(**queryParams).order_by("-startTime").only("startTime", "id", "status", "averageLoss")

        for trainingStep in trainingSteps:
            if trainingStep.averageLoss is not None and math.isnan(trainingStep.averageLoss):
                trainingStep.averageLoss = None
                trainingStep.save()
                logging.error("Got an unexpected nan!")

        return {"trainingSteps": json.loads(trainingSteps.to_json())}





class TrainingStepSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, training_step_id):
        user = authenticate()
        if user is None:
            abort(401)

        queryParams = {"id": training_step_id}
        if not isAdmin():
            queryParams['owner'] = user

        trainingStep = TrainingStep.objects(**queryParams).limit(1)[0]

        return {"trainingStep": json.loads(trainingStep.to_json())}

