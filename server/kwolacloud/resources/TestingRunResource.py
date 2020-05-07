#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..datamodels.TestingRun import TestingRun
from ..tasks.RunTesting import runTesting
import json
import bson

class TestingRunsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        self.postParser.add_argument('status', help='This field cannot be blank', required=False)

    def get(self):
        TestingRuns = TestingRun.objects().order_by("-startTime").limit(20).to_json()

        return {"testingRuns": json.loads(TestingRuns)}

    def post(self):
        data = self.postParser.parse_args()

        newTestingRun = TestingRun(


        )

        newTestingRun.save()

        runTesting.delay(str(newTestingRun.id))

        return {}


class TestingRunsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, testing_sequence_id):
        testingRun = TestingRun.objects(id=bson.ObjectId(testing_sequence_id)).limit(1)[0].to_json()

        return {"testingRun": json.loads(testingRun)}

