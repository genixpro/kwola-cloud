from flask_restful import Resource, reqparse
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.tasks.RunTestingSequence import runTestingSequence
import json
import os
import flask
from kwola.config import config
import os.path


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
        executionSessions = ExecutionSession.objects().order_by("-startTime").to_json()

        return {"executionSessions": json.loads(executionSessions)}



class ExecutionSessionSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, execution_session_id):
        executionSession = ExecutionSession.objects(id=execution_session_id).limit(1)[0].to_json()

        return {"executionSession": json.loads(executionSession)}



class ExecutionSessionVideo(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, execution_session_id):
        videoFilePath = os.path.join(config.getKwolaUserDataDirectory("debug_videos"), f'{str(execution_session_id)}.mp4')

        with open(videoFilePath, 'rb') as videoFile:
            videoData = videoFile.read()

        response = flask.make_response(videoData)
        response.headers['content-type'] = 'application/octet-stream'
        return response


