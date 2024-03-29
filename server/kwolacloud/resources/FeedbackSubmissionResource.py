#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration
from ..config.config import loadCloudConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.FeedbackSubmission import FeedbackSubmission
from ..helpers.slack import postToKwolaSlack
from flask_restful import Resource, reqparse, abort
import flask
from ..helpers.auth0 import getUserProfileFromId


class FeedbackSubmissionsGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

        self.configData = loadCloudConfiguration()

    def post(self):
        user, claims = authenticate(returnAllClaims=True)
        if user is None:
            return abort(401)

        data = flask.request.get_json()

        data['owner'] = user

        data['id'] = generateKwolaId(modelClass=FeedbackSubmission, kwolaConfig=getKwolaConfiguration(), owner=user)
        newFeedbackSubmission = FeedbackSubmission(**data)
        newFeedbackSubmission.save()

        email = getUserProfileFromId(user)['email']

        message = f"We received feedback from user {email}. Screen: {data['screen']}. Valence: {data['valence']}."
        if data['text']:
            message += f" Text: {data['text']}"
        postToKwolaSlack(message, error=False)

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

        email = getUserProfileFromId(user)['email']

        postToKwolaSlack(f"We received feedback from user {email}. Valence: {submission.valence}. Text: {submission.text}", error=False)

        return {}
