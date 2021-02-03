#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..app import cache
from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration, loadCloudConfiguration
from ..tasks.BugReproductionTask import runBugReproductionJob
from ..tasks.RunTesting import runTesting
from flask_jwt_extended import (create_access_token, create_refresh_token, jwt_required,
                                jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from flask_restful import Resource, reqparse, abort
from google.cloud import storage
from kwola.config.config import getSharedGCSStorageClient
from kwola.config.config import KwolaCoreConfiguration
from kwolacloud.datamodels.BehaviouralDifference import BehaviouralDifference
from kwolacloud.datamodels.TestingRun import TestingRun
from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from kwola.datamodels.CustomIDField import CustomIDField
import bson
import flask
import flask
import google.cloud.exceptions
import json
import logging
import os.path

class BehaviouralDifferencesGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)
        pass

    def get(self):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}
        testingRunId = flask.request.args.get('newTestingRunId')
        if testingRunId is None:
            return abort(400)

        testingRun = TestingRun.objects(id=testingRunId).first()
        if testingRun is None:
            return abort(400)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, testingRun.applicationId):
            return abort(403)

        if testingRunId is not None:
            queryParams["newTestingRunId"] = testingRunId

        executionSessionId = flask.request.args.get('newExecutionSessionId')
        if executionSessionId is not None:
            queryParams["newExecutionSessionId"] = testingRunId

        executionTraceId = flask.request.args.get('newExecutionTraceId')
        if executionTraceId is not None:
            queryParams["newExecutionTraceId"] = executionTraceId

        # fields = ["id", "error", "isMuted", "importanceLevel", "status", "isBugNew"]
        differences = BehaviouralDifference.objects(**queryParams).no_dereference()


        return {"behaviouralDifferences": json.loads(differences.to_json())}

