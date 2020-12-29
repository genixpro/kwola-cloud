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
        if testingRunId is not None:
            queryParams["testingRunId"] = testingRunId

        queryParams["isMuted"] = False

        fields = ["id", "error", "isMuted", "importanceLevel", "status", "isBugNew", "canonicalPageUrl"]
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
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        return {"bug": json.loads(bug.to_json())}

    def post(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

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
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        videoFilePath = os.path.join("bugs", f'{str(bug_id)}_bug_{str(bug.executionSessionId)}.mp4')

        storageClient = getSharedGCSStorageClient()
        applicationStorageBucket = storage.Bucket(storageClient, "kwola-testing-run-data-" + bug.applicationId)
        objectBlob = storage.Blob(videoFilePath, applicationStorageBucket)

        try:
            videoData = objectBlob.download_as_string()

            response = flask.make_response(videoData)
            response.headers['content-type'] = 'video/mp4'

            return response
        except google.cloud.exceptions.NotFound:
            logging.error(f"Error! Missing bug video file: {videoFilePath}")
            return abort(404)
        finally:
            pass



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
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        spriteFilePath = os.path.join("bug_frame_sprite_sheets", f'{str(bug_id)}.jpg')

        storageClient = getSharedGCSStorageClient()
        applicationStorageBucket = storage.Bucket(storageClient, "kwola-testing-run-data-" + bug.applicationId)
        objectBlob = storage.Blob(spriteFilePath, applicationStorageBucket)

        try:
            imageData = objectBlob.download_as_string()

            response = flask.make_response(imageData)
            response.headers['content-type'] = 'image/jpeg'

            return response
        except google.cloud.exceptions.NotFound:
            logging.error(f"Error! Missing bug stripe sheet file: {spriteFilePath}")
            return abort(404)
        finally:
            pass



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
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        errorFrameFilePath = os.path.join("bug_error_frames", f'{str(bug_id)}.jpg')

        storageClient = getSharedGCSStorageClient()
        applicationStorageBucket = storage.Bucket(storageClient, "kwola-testing-run-data-" + bug.applicationId)
        objectBlob = storage.Blob(errorFrameFilePath, applicationStorageBucket)

        try:
            imageData = objectBlob.download_as_string()

            response = flask.make_response(imageData)
            response.headers['content-type'] = 'image/jpeg'

            return response
        except google.cloud.exceptions.NotFound:
            logging.error(f"Error! Missing bug error frame file: {errorFrameFilePath}")
            return abort(404)
        finally:
            pass


class BugsAdminTriggerReproduction(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def post(self, bug_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": bug_id}
        if not isAdmin():
            queryParams['owner'] = user

        bug = BugModel.objects(**queryParams).first()

        if bug is None:
            return abort(404)

        runBugReproductionJob(bug)

        return {}
