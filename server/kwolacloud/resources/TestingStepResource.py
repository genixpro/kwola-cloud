from flask_restful import Resource, reqparse
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from kwola.datamodels.TestingStepModel import TestingStep
from kwola.tasks.RunTestingStep import runTestingStep
import json
import bson

class TestingStepsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        self.postParser.add_argument('status', help='This field cannot be blank', required=False)

    def get(self):
        TestingSteps = TestingStep.objects().order_by("-startTime").limit(20).to_json()

        return {"TestingSteps": json.loads(TestingSteps)}

    def post(self):
        data = self.postParser.parse_args()


        newTestingStep = TestingStep(
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
        TestingStep = TestingStep.objects(id=bson.ObjectId(testing_sequence_id)).limit(1)[0].to_json()

        return {"TestingStep": json.loads(TestingStep)}

