#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)

from ..app import cache
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwolacloud.datamodels.TestingRun import TestingRun
from kwola.tasks.RunTestingStep import runTestingStep
import json
import os
import logging
import flask
from kwola.config.config import KwolaCoreConfiguration
from kwolacloud.config.config import loadCloudConfiguration
from kwolacloud.tasks.BehaviourChangeDetectionTask import runBehaviourChangeDetectionJob
import os.path
from ..tasks.utils import getSharedGCSStorageClient
from ..auth import authenticate, isAdmin
import concurrent.futures
from google.cloud import storage
from mongoengine.queryset.visitor import Q
import google.cloud.exceptions


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

        queryParams = {

        }

        if not isAdmin():
            queryParams['owner'] = user

        testingRunId = flask.request.args.get('testingRunId')
        if testingRunId is not None:
            queryParams["testingRunId"] = testingRunId

        executionSessions = ExecutionSession.objects(Q(totalReward__exists=True, status__exists=False) | Q(status="completed"), **queryParams).no_dereference().order_by("-startTime").to_json()

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

        storageClient = getSharedGCSStorageClient()
        applicationStorageBucket = storage.Bucket(storageClient, "kwola-testing-run-data-" + executionSession.applicationId)
        objectPath = f"annotated_videos/{str(execution_session_id)}.mp4"
        objectBlob = storage.Blob(objectPath, applicationStorageBucket)

        try:
            videoData = objectBlob.download_as_string()

            response = flask.make_response(videoData)
            response.headers['content-type'] = 'video/mp4'

            return response
        except google.cloud.exceptions.NotFound:
            logging.error(f"Error! Missing execution session video: {objectPath}")
            return abort(404)


class ExecutionSessionTraces(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

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

        testingRun = TestingRun.objects(id=executionSession.testingRunId).first()
        config = testingRun.configuration.createKwolaCoreConfiguration(testingRun.owner, testingRun.applicationId, testingRun.id)

        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            traces = executor.map(lambda traceId: ExecutionTrace.loadFromDisk(traceId, config, omitLargeFields=True, applicationId=executionSession.applicationId),
                                  executionSession.executionTraces)

        return {"executionTraces": [json.loads(trace.to_json()) for trace in traces]}


class ExecutionSessionSingleTrace(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    @cache.cached(timeout=36000)
    def get(self, execution_session_id, execution_trace_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": execution_session_id}
        if not isAdmin():
            queryParams['owner'] = user

        executionSession = ExecutionSession.objects(**queryParams).first()

        if executionSession is None:
            return abort(404)

        testingRun = TestingRun.objects(id=executionSession.testingRunId).first()
        config = testingRun.configuration.createKwolaCoreConfiguration(testingRun.owner, testingRun.applicationId, testingRun.id)

        trace = ExecutionTrace.loadFromDisk(execution_trace_id, config, applicationId=executionSession.applicationId)

        return {"executionTrace": json.loads(trace.to_json())}



class ExecutionSessionTriggerChangeDetection(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def post(self, execution_session_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": execution_session_id}
        if not isAdmin():
            queryParams['owner'] = user

        session = ExecutionSession.objects(**queryParams).first()

        if session is None:
            return abort(404)

        runBehaviourChangeDetectionJob(session.testingRunId, session.id)

        return {}
