from .config.config import loadCloudConfiguration
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
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess

initializeKwolaCloudProcess()

cacheConfig = {
    "CACHE_TYPE": "simple",
    "CACHE_DEFAULT_TIMEOUT": 300
}

flaskApplication = Flask(__name__)
flaskApplication.config.from_mapping(cacheConfig)
api = Api(flaskApplication)
CORS(flaskApplication)
cache = Cache(flaskApplication)

cloudConfig = loadCloudConfiguration()

# Technically for gunicorn to find the flask application object, it must have the variable
# name "application". However we prefer the more explicit flaskApplication, this being the
# exception
application = flaskApplication

# import models
from .resources.ApplicationResource import ApplicationGroup, ApplicationSingle, ApplicationImage, \
    ApplicationSubscribeToSlack, ApplicationTestSlack, ApplicationIntegrateWithJIRA,\
    ApplicationTestWebhook, NewApplicationTestImage, AttachCardToUser, TestAutoLogin
from .resources.TestingStepResource import TestingStepsGroup, TestingStepsSingle
from .resources.ExecutionSessionResource import ExecutionSessionGroup, ExecutionSessionSingle, ExecutionSessionAnnotatedVideo, ExecutionSessionTraces, ExecutionSessionSingleTrace, ExecutionSessionTriggerChangeDetection, ExecutionSessionRawVideo
from .resources.TrainingSequenceResource import TrainingSequencesGroup, TrainingSequencesSingle
from .resources.TrainingStepResources import TrainingStepGroup, TrainingStepSingle
from .resources.TestingRunResource import TestingRunsGroup, TestingRunsSingle, TestingRunsRestart, TestingRunsRestartTraining, TestingRunsDownloadZip, PauseTestingRun, ResumeTestingRun
from .resources.BugsResource import BugsGroup, BugsSingle, BugVideo, BugFrameSpriteSheet, BugErrorFrame, BugsAdminTriggerReproduction, ExportBugToJIRA
from .resources.Webhooks import StripeWebhook
from .resources.Billing import BillingURLResource
from .resources.PromoCodes import PromoCodes
from .resources.HomeResource import Home
from .resources.MutedErrorResource import MutedErrorsGroup, MutedErrorsSingle
from .resources.FeedbackSubmissionResource import FeedbackSubmissionsGroup, FeedbackSubmissionSingle
from .resources.RecurringTestingTriggerResource import RecurringTestingTriggerGroup, RecurringTestingTriggerSingle
from .resources.InternalSlackNotification import InternalSlackNotification
from .resources.SelfTest import AutologinForSelfTest
from .resources.BehaviouralDifferencesResource import BehaviouralDifferencesGroup
from .resources.GmailMarketingAuth import GmailMarketingAuthStart, GmailMarketingAuthCallback, GmailMarketingTestEmail

api.add_resource(ApplicationGroup, '/api/application')
api.add_resource(ApplicationSingle, '/api/application/<string:application_id>')
api.add_resource(ApplicationImage, '/api/application/<string:application_id>/image')
api.add_resource(ApplicationTestSlack, '/api/application/<string:application_id>/slack/test')
api.add_resource(ApplicationSubscribeToSlack, '/api/application/<string:application_id>/slack')
api.add_resource(ApplicationIntegrateWithJIRA, '/api/application/<string:application_id>/jira')
api.add_resource(ApplicationTestWebhook, '/api/application/<string:application_id>/webhook/<string:webhook_field>/test')
api.add_resource(NewApplicationTestImage, '/api/application_test_image')
api.add_resource(AttachCardToUser, '/api/attach_card')
api.add_resource(TestAutoLogin, '/api/test_autologin')


api.add_resource(TestingStepsGroup, '/api/testing_sequences')
api.add_resource(TestingStepsSingle, '/api/testing_sequences/<string:testing_sequence_id>')


api.add_resource(TrainingSequencesGroup, '/api/training_sequences')
api.add_resource(TrainingSequencesSingle, '/api/training_sequences/<string:training_sequence_id>')


api.add_resource(ExecutionSessionGroup, '/api/execution_sessions')
api.add_resource(ExecutionSessionSingle, '/api/execution_sessions/<string:execution_session_id>')
api.add_resource(ExecutionSessionAnnotatedVideo, '/api/execution_sessions/<string:execution_session_id>/video')
api.add_resource(ExecutionSessionRawVideo, '/api/execution_sessions/<string:execution_session_id>/raw_video')
api.add_resource(ExecutionSessionTraces, '/api/execution_sessions/<string:execution_session_id>/traces')
api.add_resource(ExecutionSessionSingleTrace, '/api/execution_sessions/<string:execution_session_id>/traces/<string:execution_trace_id>')
api.add_resource(ExecutionSessionTriggerChangeDetection, '/api/execution_sessions/<string:execution_session_id>/start_change_detection_job')


api.add_resource(TestingRunsGroup, '/api/testing_runs')
api.add_resource(TestingRunsSingle, '/api/testing_runs/<string:testing_run_id>')
api.add_resource(TestingRunsRestart, '/api/testing_runs/<string:testing_run_id>/restart')
api.add_resource(TestingRunsRestartTraining, '/api/testing_runs/<string:testing_run_id>/restart_training')
api.add_resource(TestingRunsDownloadZip, '/api/testing_runs/<string:testing_run_id>/bugs_zip')
api.add_resource(PauseTestingRun, '/api/testing_runs/<string:testing_run_id>/pause')
api.add_resource(ResumeTestingRun, '/api/testing_runs/<string:testing_run_id>/resume')


api.add_resource(TrainingStepGroup, '/api/training_steps')
api.add_resource(TrainingStepSingle, '/api/training_steps/<string:training_step_id>')

api.add_resource(MutedErrorsGroup, '/api/muted_errors')
api.add_resource(MutedErrorsSingle, '/api/muted_errors/<string:muted_error_id>')


api.add_resource(BugsGroup, '/api/bugs')
api.add_resource(BugsSingle, '/api/bugs/<string:bug_id>')
api.add_resource(BugVideo, '/api/bugs/<string:bug_id>/video')
api.add_resource(BugFrameSpriteSheet, '/api/bugs/<string:bug_id>/frame_sprite_sheet')
api.add_resource(BugErrorFrame, '/api/bugs/<string:bug_id>/error_frame')
api.add_resource(BugsAdminTriggerReproduction, '/api/bugs/<string:bug_id>/start_reproduction_job')
api.add_resource(ExportBugToJIRA, '/api/bugs/<string:bug_id>/export_to_jira')

api.add_resource(BillingURLResource, '/api/billing')
api.add_resource(PromoCodes, '/api/promocodes')

api.add_resource(StripeWebhook, '/api/stripe_webhook')

api.add_resource(Home, '/api/home')

api.add_resource(FeedbackSubmissionsGroup, '/api/feedback_submission')
api.add_resource(FeedbackSubmissionSingle, '/api/feedback_submission/<string:feedback_submission_id>')


api.add_resource(RecurringTestingTriggerGroup, '/api/recurring_testing_trigger')
api.add_resource(RecurringTestingTriggerSingle, '/api/recurring_testing_trigger/<string:recurring_testing_trigger_id>')
api.add_resource(InternalSlackNotification, '/api/internal_slack_notification')
api.add_resource(BehaviouralDifferencesGroup, '/api/behavioural_differences')

api.add_resource(GmailMarketingAuthStart, '/api/marketing_auth_start')
api.add_resource(GmailMarketingAuthCallback, '/api/marketing_auth')
api.add_resource(GmailMarketingTestEmail, '/api/marketing_test_email')

if cloudConfig['features']['enableSelfTestLoginEndpoint']:
    api.add_resource(AutologinForSelfTest, '/api/self_test_login')

# api.add_resource(resources.TokenRefresh, '/refresh')
# api.add_resource(resources.SecretResource, '/api/secret/test')
