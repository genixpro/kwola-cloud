#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import flask
from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from kwola.datamodels.BugModel import BugModel
from ..tasks.RunTesting import runTesting
import json
import bson
from kwola.datamodels.CustomIDField import CustomIDField
from ..config.config import getKwolaConfiguration
import flask
from kwola.config.config import Configuration
import os.path
from ..tasks.RunTesting import mountTestingRunStorageDrive, unmountTestingRunStorageDrive

class BugsGroup(Resource):
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

        bugs = BugModel.objects(**queryParams).no_dereference().order_by("-startTime")

        return {"bugs": json.loads(bugs.to_json())}



class BugsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def get(self, bug_id):
        bug = BugModel.objects(id=bug_id).first()

        return {"bug": json.loads(bug.to_json())}



class BugVideo(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, bug_id):
        bug = BugModel.objects(id=bug_id).first()

        if bug is None:
            return abort(404)

        configDir = mountTestingRunStorageDrive(bug.testingRunId)

        config = Configuration(configDir)

        videoFilePath = os.path.join(config.getKwolaUserDataDirectory("bugs"), f'{str(bug_id)}_bug_{str(bug.executionSessionId)}.mp4')

        with open(videoFilePath, 'rb') as videoFile:
            videoData = videoFile.read()

        response = flask.make_response(videoData)
        response.headers['content-type'] = 'video/mp4'

        unmountTestingRunStorageDrive(configDir)

        return response


