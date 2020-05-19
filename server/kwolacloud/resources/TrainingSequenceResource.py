#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..app import cache

from kwola.datamodels.TrainingSequenceModel import TrainingSequence
import json
from ..auth import authenticate, isAdmin


class TrainingSequencesGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=False)

    def get(self):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {}
        if not isAdmin():
            queryParams['owner'] = user

        trainingSequences = TrainingSequence.objects(**queryParams).order_by("-startTime").limit(20).to_json()

        return {"trainingSequences": json.loads(trainingSequences)}





class TrainingSequencesSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        # self.postParser.add_argument('version', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('startTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('endTime', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=True)
        # self.postParser.add_argument('status', help='This field cannot be blank', required=True)

    def get(self, training_sequence_id):
        user = authenticate()
        if user is None:
            return abort(401)

        queryParams = {"id": training_sequence_id}
        if not isAdmin():
            queryParams['owner'] = user

        trainingSequence = TrainingSequence.objects(**queryParams)

        if trainingSequence is None:
            return abort(404)

        return {"trainingSequence": json.loads(trainingSequence.to_json())}

