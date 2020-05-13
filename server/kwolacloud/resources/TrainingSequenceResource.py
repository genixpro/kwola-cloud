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
from ..auth import authenticate


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
            abort(401)

        trainingSequences = TrainingSequence.objects().order_by("-startTime").limit(20).to_json()

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
            abort(401)

        trainingSequence = TrainingSequence.objects(id=training_sequence_id).limit(1)[0].to_json()

        return {"trainingSequence": json.loads(trainingSequence)}

