#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from kwolacloud.datamodels.ApplicationModel import ApplicationModel
from kwolacloud.datamodels.Counter import CounterModel
from kwolacloud.datamodels.FeedbackSubmission import FeedbackSubmission
from kwolacloud.datamodels.KubernetesJobLogs import KubernetesJobLogs
from kwolacloud.datamodels.KubernetesJobResult import KubernetesJobResult
from kwolacloud.datamodels.MutedError import MutedError
from kwolacloud.datamodels.RecurringTestingTrigger import RecurringTestingTrigger
from kwolacloud.datamodels.TestingRun import TestingRun
from kwola.datamodels.BugModel import BugModel
from kwola.datamodels.TrainingSequenceModel import TrainingSequence
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionSessionTraceWeights import ExecutionSessionTraceWeights
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwola.datamodels.TrainingStepModel import TrainingStep
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess
from mongoengine import connect
from ..db import connectToMongoWithRetries

def main():
    initializeKwolaCloudProcess()

    ApplicationModel.objects().delete()
    TrainingSequence.objects().delete()
    TestingStep.objects().delete()
    ExecutionSession.objects().delete()
    ExecutionTrace.objects().delete()
    TrainingStep.objects().delete()
    BugModel.objects().delete()
    CounterModel.objects().delete()
    ExecutionSessionTraceWeights.objects().delete()
    FeedbackSubmission.objects().delete()
    KubernetesJobLogs.objects().delete()
    KubernetesJobResult.objects().delete()
    MutedError.objects().delete()
    RecurringTestingTrigger.objects().delete()
    TestingRun.objects().delete()

    print("Kwola Mongo database is now cleared")
