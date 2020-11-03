#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
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
from kwola.datamodels.errors.LogError import LogError
from kwola.datamodels.errors.BaseError import BaseError
from kwola.datamodels.errors.ExceptionError import ExceptionError
from kwola.datamodels.errors.HttpError import HttpError
from kwola.datamodels.TrainingSequenceModel import TrainingSequence
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionSessionTraceWeights import ExecutionSessionTraceWeights
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwola.datamodels.TrainingStepModel import TrainingStep
from ..db import connectToMongoWithRetries
from kwola.config.logger import getLogger
import json
from mongoengine.context_managers import switch_db
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess

def transferModel(modelClass):
    getLogger().info(f"Transferring data for {modelClass.__name__}")

    with switch_db(modelClass, "demo_backup") as backupModelClass:
        backupObjIds = [o.id for o in backupModelClass.objects().only("id")]

    count = 0
    for backupId in backupObjIds:
        with switch_db(modelClass, "demo_backup") as backupModelClass:
            backup = backupModelClass.objects(id=backupId).first()
        with switch_db(modelClass, "default") as targetModelClass:
            data = json.loads(backup.to_json())
            id = data['_id']
            del data['_id']
            obj = targetModelClass(**data)
            obj.id = id
            obj.save(validate=False)
        count += 1
        if count % 100 == 0:
            getLogger().info(f"Transferred {count} objects so far.")
    getLogger().info(f"Transferred {count} objects between the databases.")


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

    connectToMongoWithRetries(alias="demo_backup", db="demo_backup")

    transferModel(ApplicationModel)
    transferModel(ExecutionTrace)
    transferModel(ExecutionSession)
    transferModel(TestingRun)
    transferModel(BugModel)
    transferModel(MutedError)
    transferModel(RecurringTestingTrigger)
    transferModel(KubernetesJobLogs)
    transferModel(KubernetesJobResult)
    transferModel(FeedbackSubmission)
    transferModel(CounterModel)
    transferModel(TrainingSequence)
    transferModel(TestingStep)
    transferModel(ExecutionSessionTraceWeights)
    transferModel(TrainingStep)

    getLogger().info("Kwola database has now been restored with all the demo data.")
