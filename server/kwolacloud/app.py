from .config.config import loadConfiguration
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restful import Api
from kombu import Queue
from mongoengine import connect
import stripe
import time
from .db import connectToMongoWithRetries
from .datamodels.ApplicationModel import ApplicationModel
from .auth import authenticate
from flask_caching import Cache
import google.cloud.logging
from .helpers.slack import SlackLogHandler
from kwola.config.logger import getLogger, setupLocalLogging

configData = loadConfiguration()

stripe.api_key = configData['stripe']['apiKey']

connectToMongoWithRetries()

cacheConfig = {
    "CACHE_TYPE": "simple",
    "CACHE_DEFAULT_TIMEOUT": 300
}

flaskApplication = Flask(__name__)
flaskApplication.config.from_mapping(cacheConfig)
api = Api(flaskApplication)
CORS(flaskApplication)
cache = Cache(flaskApplication)

if configData['features']['enableGoogleCloudLogging']:
    # Setup logging with google cloud
    loggingClient = google.cloud.logging.Client()
    loggingClient.get_default_handler()
    loggingClient.setup_logging()

    logger = getLogger()
    logger.handlers = logger.handlers[0:1]

if configData['features']['enableSlackLogging']:
    logger = getLogger()
    logger.addHandler(SlackLogHandler())

# Technically for gunicorn to find the flask application object, it must have the variable
# name "application". However we prefer the more explicit flaskApplication, this being the
# exception
application = flaskApplication

# import models
from .resources.ApplicationResource import ApplicationGroup, ApplicationSingle, ApplicationImage, ApplicationSubscribeToSlack, ApplicationTestSlack
from .resources.TestingStepResource import TestingStepsGroup, TestingStepsSingle
from .resources.ExecutionSessionResource import ExecutionSessionGroup, ExecutionSessionSingle, ExecutionSessionVideo
from .resources.ExecutionTraceResource import ExecutionTraceGroup, ExecutionTraceSingle
from .resources.TrainingSequenceResource import TrainingSequencesGroup, TrainingSequencesSingle
from .resources.TrainingStepResources import TrainingStepGroup, TrainingStepSingle
from .resources.TestingRunResource import TestingRunsGroup, TestingRunsSingle, TestingRunsRestart
from .resources.BugsResource import BugsGroup, BugsSingle, BugVideo
from .resources.Webhooks import StripeWebhook
from .resources.Billing import BillingURLResource, Products
from .resources.PromoCodes import PromoCodes
from .resources.HomeResource import Home
from .resources.MutedErrorResource import MutedErrorsGroup, MutedErrorsSingle
from .resources.FeedbackSubmissionResource import FeedbackSubmissionsGroup, FeedbackSubmissionSingle

api.add_resource(ApplicationGroup, '/api/application')
api.add_resource(ApplicationSingle, '/api/application/<string:application_id>')
api.add_resource(ApplicationImage, '/api/application/<string:application_id>/image')
api.add_resource(ApplicationTestSlack, '/api/application/<string:application_id>/slack/test')
api.add_resource(ApplicationSubscribeToSlack, '/api/application/<string:application_id>/slack')


api.add_resource(TestingStepsGroup, '/api/testing_sequences')
api.add_resource(TestingStepsSingle, '/api/testing_sequences/<string:testing_sequence_id>')


api.add_resource(TrainingSequencesGroup, '/api/training_sequences')
api.add_resource(TrainingSequencesSingle, '/api/training_sequences/<string:training_sequence_id>')


api.add_resource(ExecutionSessionGroup, '/api/execution_sessions')
api.add_resource(ExecutionSessionSingle, '/api/execution_sessions/<string:execution_session_id>')
api.add_resource(ExecutionSessionVideo, '/api/execution_sessions/<string:execution_session_id>/video')


api.add_resource(ExecutionTraceGroup, '/api/execution_traces')
api.add_resource(ExecutionTraceSingle, '/api/execution_traces/<string:execution_trace_id>')


api.add_resource(TestingRunsGroup, '/api/testing_runs')
api.add_resource(TestingRunsSingle, '/api/testing_runs/<string:testing_run_id>')
api.add_resource(TestingRunsRestart, '/api/testing_runs/<string:testing_run_id>/restart')


api.add_resource(TrainingStepGroup, '/api/training_steps')
api.add_resource(TrainingStepSingle, '/api/training_steps/<string:training_step_id>')

api.add_resource(MutedErrorsGroup, '/api/muted_errors')
api.add_resource(MutedErrorsSingle, '/api/muted_errors/<string:muted_error_id>')


api.add_resource(BugsGroup, '/api/bugs')
api.add_resource(BugsSingle, '/api/bugs/<string:bug_id>')
api.add_resource(BugVideo, '/api/bugs/<string:bug_id>/video')

api.add_resource(BillingURLResource, '/api/billing')
api.add_resource(Products, '/api/products')
api.add_resource(PromoCodes, '/api/promocodes')

api.add_resource(StripeWebhook, '/api/stripe_webhook')

api.add_resource(Home, '/api/home')

api.add_resource(FeedbackSubmissionsGroup, '/api/feedback_submission')
api.add_resource(FeedbackSubmissionSingle, '/api/feedback_submission/<string:feedback_submission_id>')

# api.add_resource(resources.TokenRefresh, '/refresh')
# api.add_resource(resources.SecretResource, '/api/secret/test')
