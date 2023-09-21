#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from kwola.datamodels.TypingActionConfiguration import TypingActionConfiguration
from flask_restful import Resource, reqparse, abort
import flask


class TypingActionConfigurationExamples(Resource):
    def post(self):
        data = flask.request.get_json()

        typingActionConfiguration = TypingActionConfiguration(**data)

        examples = [
            typingActionConfiguration.generateText() for n in range(4)
        ]

        return {"examples": examples}


