#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from ..auth import authenticate, isAdmin
from ..config.config import getKwolaConfiguration
from ..config.config import loadConfiguration
from ..datamodels.id_utility import generateKwolaId
from ..datamodels.FeedbackSubmission import FeedbackSubmission
from ..helpers.slack import postToKwolaSlack
from flask_restful import Resource, reqparse, abort
import flask


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

        message = f"We received feedback with id {data['id']}. Screen: {data['screen']}. Valence: {data['valence']}."
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
