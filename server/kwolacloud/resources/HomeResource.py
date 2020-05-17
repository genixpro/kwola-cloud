#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse
import subprocess
import json
import os

class Home(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('version', help='This field cannot be blank', required=False)
        self.postParser.add_argument('startTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('endTime', help='This field cannot be blank', required=False)
        self.postParser.add_argument('bugsFound', help='This field cannot be blank', required=False)
        self.postParser.add_argument('status', help='This field cannot be blank', required=False)

    def get(self):
        version = os.getenv("REVISION_ID")

        return {"version": str(version)}
