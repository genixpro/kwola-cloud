from .config.config import loadConfiguration
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restful import Api
from kombu import Queue
from mongoengine import connect
import celery
import stripe
from .auth import authenticate
from flask_caching import Cache
import google.cloud.logging

configData = loadConfiguration()

stripe.api_key = configData['stripe']['apiKey']

connect(configData['mongo']['db'], host=configData['mongo']['uri'])

cacheConfig = {
    "CACHE_TYPE": "simple",
    "CACHE_DEFAULT_TIMEOUT": 300
}

flaskApplication = Flask(__name__)
flaskApplication.config.from_mapping(cacheConfig)
api = Api(flaskApplication)
CORS(flaskApplication)
cache = Cache(flaskApplication)

# Setup logging with google cloud
client = google.cloud.logging.Client()
client.get_default_handler()
client.setup_logging()

# Technically for gunicorn to find the flask application object, it must have the variable
# name "application". However we prefer the more explicit flaskApplication, this being the
# exception
application = flaskApplication

celeryApplication = celery.Celery()
celeryApplication.conf.broker_url = f"redis://{configData['redis']['host']}:{configData['redis']['port']}/{configData['redis']['taskDB']}"
celeryApplication.conf.broker_transport_options = {'visibility_timeout': configData['redis']['visibility_timeout']}  # 1 hour.
celeryApplication.conf.result_backend = f"redis://{configData['redis']['host']}:{configData['redis']['port']}/{configData['redis']['resultDB']}"

celeryApplication.conf.task_default_queue = 'default'
celeryApplication.conf.task_queues = (
    Queue('default',    routing_key='defaulttask.#'),
    Queue('testing',    routing_key='testingtask.#'),
    Queue('training',    routing_key='trainingtask.#')
)

# import models
from .resources.ApplicationResource import ApplicationGroup, ApplicationSingle, ApplicationImage
from .resources.TestingStepResource import TestingStepsGroup, TestingStepsSingle
from .resources.ExecutionSessionResource import ExecutionSessionGroup, ExecutionSessionSingle, ExecutionSessionVideo
from .resources.ExecutionTraceResource import ExecutionTraceGroup, ExecutionTraceSingle
from .resources.TrainingSequenceResource import TrainingSequencesGroup, TrainingSequencesSingle
from .resources.TrainingStepResources import TrainingStepGroup, TrainingStepSingle
from .resources.TestingRunResource import TestingRunsGroup, TestingRunsSingle
from .resources.BugsResource import BugsGroup, BugsSingle, BugVideo
from .resources.Webhooks import StripeWebhook
from .resources.HomeResource import Home

api.add_resource(ApplicationGroup, '/api/application')
api.add_resource(ApplicationSingle, '/api/application/<string:application_id>')
api.add_resource(ApplicationImage, '/api/application/<string:application_id>/image')


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


api.add_resource(TrainingStepGroup, '/api/training_steps')
api.add_resource(TrainingStepSingle, '/api/training_steps/<string:training_step_id>')


api.add_resource(BugsGroup, '/api/bugs')
api.add_resource(BugsSingle, '/api/bugs/<string:bug_id>')
api.add_resource(BugVideo, '/api/bugs/<string:bug_id>/video')

api.add_resource(StripeWebhook, '/api/stripe_webhook')

api.add_resource(Home, '/api/home')

# api.add_resource(resources.TokenRefresh, '/refresh')
# api.add_resource(resources.SecretResource, '/api/secret/test')
