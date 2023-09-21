#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from ..app import cache
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.tasks.RunTestingStep import runTestingStep
import json
import bson
from ..auth import authenticate, isAdmin

class TestingStepsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        self.postParser.add_argument('status', help='This field cannot be blank', required=False)

    def get(self):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}

        if not isAdmin():
            queryParams['owner'] = user

        TestingSteps = TestingStep.objects(**queryParams).order_by("-startTime").limit(20).to_json()

        return {"TestingSteps": json.loads(TestingSteps)}

    def post(self):
        user = authenticate()
        if user is None:
            return abort(401)

        data = self.postParser.parse_args()


        newTestingStep = TestingStep(
            owner=user,
            version=data['version'],
            startTime=data['startTime'],
            endTime=data['endTime'],
            bugsFound=data['bugsFound'],
            status=data['status'],
            executionSessions=[],
            errors=[]
        )

        newTestingStep.save()

        runTestingStep.delay(str(newTestingStep.id))

        return {}


class TestingStepsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, testing_sequence_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": testing_sequence_id}
        if not isAdmin():
            queryParams['owner'] = user

        testingStep = TestingStep.objects(**testing_sequence_id).first()

        if testingStep is None:
            return abort(404)

        return {"TestingStep": json.loads(testingStep.to_json())}

