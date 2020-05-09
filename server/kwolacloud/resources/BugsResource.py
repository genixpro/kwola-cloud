#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import flask
from flask_restful import Resource, reqparse
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from kwola.datamodels.BugModel import BugModel
from ..tasks.RunTesting import runTesting
import json
import bson
from kwola.datamodels.CustomIDField import CustomIDField
from ..config.config import getKwolaConfiguration


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
        bugs = BugModel.objects().order_by("-startTime").limit(20)

        return {"bugs": json.loads(bugs.to_json())}



class BugsSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()

    def get(self, testing_run_id):
        bug = BugModel.objects(id=testing_run_id).first()

        return {"bug": json.loads(bug.to_json())}

