#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from ..app import cache
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.tasks.RunTestingStep import runTestingStep
import json
import os
import flask
from kwola.config.config import Configuration
import os.path
from ..tasks.RunTesting import mountTestingRunStorageDrive, unmountTestingRunStorageDrive
from ..auth import authenticate, isAdmin

class ExecutionSessionGroup(Resource):
    def __init__(self):
        # self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)
        pass

    def get(self):
        user = authenticate()
        if user is None:
            abort(401)

        queryParams = {'totalReward__exists': True}

        if not isAdmin():
            queryParams['owner'] = user

        testingRunId = flask.request.args.get('testingRunId')
        if testingRunId is not None:
            queryParams["testingRunId"] = testingRunId

        executionSessions = ExecutionSession.objects(**queryParams).no_dereference().order_by("startTime").to_json()

        return {"executionSessions": json.loads(executionSessions)}



class ExecutionSessionSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    @cache.cached(timeout=36000)
    def get(self, execution_session_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": execution_session_id}
        if not isAdmin():
            queryParams['owner'] = user

        executionSession = ExecutionSession.objects(**queryParams).limit(1)[0].to_json()

        if executionSession is None:
            return abort(404)

        return {"executionSession": json.loads(executionSession)}



class ExecutionSessionVideo(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    @cache.cached(timeout=36000)
    def get(self, execution_session_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": execution_session_id}
        if not isAdmin():
            queryParams['owner'] = user

        executionSession = ExecutionSession.objects(**queryParams).first()

        if executionSession is None:
            return abort(404)

        configDir = mountTestingRunStorageDrive(executionSession.testingRunId)

        config = Configuration(configDir)

        videoFilePath = os.path.join(config.getKwolaUserDataDirectory("annotated_videos"), f'{str(execution_session_id)}.mp4')

        with open(videoFilePath, 'rb') as videoFile:
            videoData = videoFile.read()

        response = flask.make_response(videoData)
        response.headers['content-type'] = 'video/mp4'

        unmountTestingRunStorageDrive(configDir)

        return response


