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
from kwola.datamodels.BugModel import BugModel
from kwolacloud.datamodels.TestingRun import TestingRun
from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from ..helpers.jira import postBugToCustomerJIRA
from kwola.datamodels.CustomIDField import CustomIDField
import bson
import flask
import flask
import google.cloud.exceptions
import json
import logging
import os.path

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
        if testingRunId is None:
            return abort(400)

        testingRun = TestingRun.objects(id=testingRunId).first()
        if testingRun is None:
            return abort(400)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, testingRun.applicationId):
            return abort(403)

        queryParams["testingRunId"] = testingRunId
        queryParams["isMuted"] = False

        fields = ["id", "error", "isMuted", "importanceLevel", "status", "isBugNew", "canonicalPageUrl", "browser", "windowSize", "applicationId"]
        bugs = BugModel.objects(**queryParams).no_dereference().order_by("importanceLevel", "-codePrevalenceScore").only(*fields)

        return {"bugs": json.loads(bugs.to_json())}



class BugsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def get(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        return {"bug": json.loads(bug.to_json())}

    def post(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        data = flask.request.get_json()
        # Only allow updating a few fields
        if 'isMuted' in data:
            bug.isMuted = data['isMuted']
        if 'mutedErrorId' in data:
            bug.mutedErrorId = data['mutedErrorId']
        if 'importanceLevel' in data:
            bug.importanceLevel = data['importanceLevel']
        if 'status' in data:
            bug.status = data['status']

        bug.save()

        return {}



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

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        testingRun = TestingRun.objects(id=bug.testingRunId).first()

        if testingRun is None:
            return abort(404)

        videoFileName = f'{str(bug_id)}_bug_{str(bug.executionSessionId)}.mp4'

        config = testingRun.configuration.createKwolaCoreConfiguration(user, testingRun.applicationId, testingRun.id)
        videoData = config.loadKwolaFileData("bugs", videoFileName)

        if videoData is not None:
            response = flask.make_response(videoData)
            response.headers['content-type'] = 'video/mp4'

            return response
        else:
            logging.error(f"Error! Missing bug video file: {videoFileName}")
            return abort(404)



class BugFrameSpriteSheet(Resource):
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

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        testingRun = TestingRun.objects(id=bug.testingRunId).first()

        if testingRun is None:
            return abort(404)

        spriteFilePath = f'{str(bug_id)}.jpg'

        config = testingRun.configuration.createKwolaCoreConfiguration(user, testingRun.applicationId, testingRun.id)
        imageData = config.loadKwolaFileData("bug_frame_sprite_sheets", spriteFilePath)

        if imageData is not None:
            response = flask.make_response(imageData)
            response.headers['content-type'] = 'image/jpeg'

            return response
        else:
            logging.error(f"Error! Missing bug sprite sheet file: {spriteFilePath}")
            return abort(404)



class BugErrorFrame(Resource):
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

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        testingRun = TestingRun.objects(id=bug.testingRunId).first()

        if testingRun is None:
            return abort(404)

        errorFrameFileName = f'{str(bug_id)}.jpg'

        config = testingRun.configuration.createKwolaCoreConfiguration(user, testingRun.applicationId, testingRun.id)
        imageData = config.loadKwolaFileData("bug_error_frames", errorFrameFileName)

        if imageData is not None:
            response = flask.make_response(imageData)
            response.headers['content-type'] = 'image/jpeg'

            return response
        else:
            logging.error(f"Error! Missing bug error frame file: {errorFrameFileName}")
            return abort(404)


class BugsAdminTriggerReproduction(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def post(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        runBugReproductionJob(bug)

        return {}


class ExportBugToJIRA(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def post(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        if not ApplicationModel.checkIfUserCanAccessApplication(user, bug.applicationId):
            return abort(403)

        application = ApplicationModel.objects(id=bug.applicationId).first()

        postBugToCustomerJIRA(bug, application)

        return {}
