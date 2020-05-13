#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from ..app import cache
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.tasks.RunTestingStep import runTestingStep
import json
import bson
from ..auth import authenticate

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
            abort(401)

        TestingSteps = TestingStep.objects(owner=user).order_by("-startTime").limit(20).to_json()

        return {"TestingSteps": json.loads(TestingSteps)}

    def post(self):
        user = authenticate()
        if user is None:
            abort(401)

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
            abort(401)

        TestingStep = TestingStep.objects(id=bson.ObjectId(testing_sequence_id), owner=user).limit(1)[0].to_json()

        return {"TestingStep": json.loads(TestingStep)}

