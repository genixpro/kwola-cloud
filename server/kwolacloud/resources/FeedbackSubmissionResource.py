#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..app import cache
from ..auth import authenticate, isAdmin
from ..components.KubernetesJob import KubernetesJob
from ..config.config import getKwolaConfiguration
from ..config.config import loadConfiguration
from ..datamodels.ApplicationModel import ApplicationModel
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.FeedbackSubmission import FeedbackSubmission
from ..helpers.slack import postToKwolaSlack
from ..helpers.email import sendStartTestingRunEmail
from ..tasks.RunTesting import runTesting
from flask_jwt_extended import (create_access_token, create_refresh_token, jwt_required, jwt_refresh_token_required,
                                get_jwt_identity, get_raw_jwt)
from flask_restful import Resource, reqparse, abort
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
import bson
import base64
import datetime
import flask
import json
import os
import stripe
import logging


class FeedbackSubmissionsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

        self.configData = loadConfiguration()

    def post(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            return abort(401)

        data = flask.request.get_json()

        data['owner'] = user

        data['id'] = generateKwolaId(modelClass=FeedbackSubmission, kwolaConfig=getKwolaConfiguration(), owner=user)
        newFeedbackSubmission = FeedbackSubmission(**data)
        newFeedbackSubmission.save()

        message = f"We received feedback with id {data['id']}. Valence: {data['valence']}."
        if data['text']:
            message += f" Text: {data['text']}"
        postToKwolaSlack(message)

        return {"feedbackSubmissionId": data['id']}


class FeedbackSubmissionSingle(Resource):
    def post(self, feedback_submission_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": feedback_submission_id}
        if not isAdmin():
            queryParams['owner'] = user

        submission = FeedbackSubmission.objects(**queryParams).first()

        if submission is None:
            return abort(404)

        data = flask.request.get_json()
        # Only allow updating the muted field
        if 'text' in data:
            submission.text = data['text']
        if 'valence' in data:
            submission.valence = data['valence']

        submission.save()

        postToKwolaSlack(f"We received feedback with id {submission.id}. Valence: {submission.valence}. Text: {submission.text}")

        return {}
