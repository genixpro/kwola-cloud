#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import flask
from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..app import cache
from kwola.datamodels.BugModel import BugModel
from ..tasks.RunTesting import runTesting
import json
import bson
from kwola.datamodels.CustomIDField import CustomIDField
from ..config.config import getKwolaConfiguration, loadConfiguration
import flask
from kwola.config.config import Configuration
import os.path
from ..tasks.RunTesting import mountTestingRunStorageDrive, unmountTestingRunStorageDrive
from ..auth import authenticate, isAdmin

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
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}

        if not isAdmin():
            queryParams['owner'] = user

        testingRunId = flask.request.args.get('testingRunId')
        if testingRunId is not None:
            queryParams["testingRunId"] = testingRunId

        bugs = BugModel.objects(**queryParams).no_dereference().order_by("-startTime")

        return {"bugs": json.loads(bugs.to_json())}



class BugsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    @cache.cached(timeout=36000)
    def get(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        return {"bug": json.loads(bug.to_json())}



class BugVideo(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    @cache.cached(timeout=36000)
    def get(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        configData = loadConfiguration()
        if not configData['features']['localRuns']:
            configDir = mountTestingRunStorageDrive(bug.applicationId)
        else:
            configDir = os.path.join("data", bug.applicationId)

        config = Configuration(configDir)

        videoFilePath = os.path.join(config.getKwolaUserDataDirectory("bugs"), f'{str(bug_id)}_bug_{str(bug.executionSessionId)}.mp4')

        if os.path.exists(videoFilePath):
            with open(videoFilePath, 'rb') as videoFile:
                videoData = videoFile.read()
        else:
            return abort(404)

        response = flask.make_response(videoData)
        response.headers['content-type'] = 'video/mp4'

        unmountTestingRunStorageDrive(configDir)

        return response


