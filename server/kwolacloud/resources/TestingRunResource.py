#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import flask
from flask_restful import Resource, reqparse
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..datamodels.TestingRun import TestingRun
from ..tasks.RunTesting import runTesting
import json
import bson
from kwola.datamodels.CustomIDField import CustomIDField
from ..config.config import getKwolaConfiguration


class TestingRunsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)
        pass

    def get(self):
        queryParams = {}

        testingRunId = flask.request.args.get('testingRunId')
        if testingRunId is not None:
            queryParams["testingRunId"] = testingRunId

        testingRuns = TestingRun.objects(**queryParams).no_dereference().order_by("-startTime").limit(10).to_json()

        return {"testingRuns": json.loads(testingRuns)}

    def post(self):
        data = flask.request.get_json()

        data['id'] = CustomIDField.generateNewUUID(TestingRun, config=getKwolaConfiguration())

        newTestingRun = TestingRun(**data)

        newTestingRun.save()

        runTesting.delay(str(newTestingRun.id))

        return {"testingRunId": data['id']}


class TestingRunsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, testing_run_id):
        testingRun = TestingRun.objects(id=testing_run_id).limit(1)[0].to_json()

        return {"testingRun": json.loads(testingRun)}

