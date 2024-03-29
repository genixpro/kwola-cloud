#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#



from kwola.datamodels.CustomIDField import CustomIDField
from .RunConfiguration import RunConfiguration
from mongoengine import *
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from kwola.datamodels.EncryptedStringField import EncryptedStringField
from ..config.config import getKwolaConfiguration
from ..config.config import loadCloudConfiguration
from dateutil.relativedelta import relativedelta
import math
import json


class TestingRun(DynamicDocument):
    meta = {
        'indexes': [
            ('owner',),
            ('owner', 'applicationId'),
            ('owner', 'recurringTestingTriggerId'),
            ('needsFeedbackRequestEmail', 'endTime'),
        ]
    }

    id = CustomIDField()

    owner = StringField()

    applicationId = StringField()

    recurringTestingTriggerId = StringField()

    stripeSubscriptionId = StringField()

    promoCode = StringField()

    configuration = EmbeddedDocumentField(RunConfiguration)

    status = StringField()

    startTime = DateTimeField()

    endTime = DateTimeField()

    predictedEndTime = DateTimeField()

    launchSource = StringField()

    bugsFound = IntField()

    # Deprecated
    testingSessionsRemaining = IntField(default=0)

    testingSessionsCompleted = IntField(default=0)

    trainingStepsCompleted = IntField(default=0)

    trainingIterationsCompleted = IntField(default=0)

    trainingIterationsNeeded = IntField(default=0)

    initializationTestingSteps = ListField(StringField())

    testingSteps = ListField(StringField())

    trainingSteps = ListField(StringField())

    averageTimePerStep = FloatField(default=0)

    needsFeedbackRequestEmail = BooleanField(default=False)

    isRecurring = BooleanField(default=False)

    runningTestingStepJobIds = ListField(StringField())

    runningTestingStepStartTimes = ListField(DateTimeField())

    runningTrainingStepJobId = StringField(default=None)

    runningTrainingStepStartTime = DateTimeField(default=None)

    testingStepsNeedingSymbolProcessing = ListField(StringField())

    failedTestingSteps = IntField(default=0)

    failedTrainingSteps = IntField(default=0)

    didTrainingFail = BooleanField(default=False)

    bugsNeedingReproduction = ListField(StringField(), default=[])

    bugReproductionFailureCounts = DictField(IntField(), default={})

    runningBugReproductionJobIds = DictField(StringField(), default={})

    runningBugReproductionStartTimes = DictField(DateTimeField(), default={})

    runningChangeDetectionJobId = StringField(default=None)

    runningChangeDetectionJobStartTime = DateTimeField()

    hasCompletedChangeDetectionJob = BooleanField(default=False)

    failedChangeDetectionTasks = IntField(default=0)

    def saveToDisk(self, config):
        self.save()


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return TestingRun.objects(id=id).first()


    def createKubernetesJobObject(self):
        from kwolacloud.components.utils.KubernetesJob import KubernetesJob

        configData = loadCloudConfiguration()

        if configData['features']['localRuns']:
            job = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.RunTestingLocal"], {
                "testingRunId": self.id
            }, timeout=1800, config=getKwolaConfiguration(), logId=None)
        else:
            job = KubernetesJob(module="kwolacloud.tasks.RunTesting",
                                data={
                                    "testingRunId": self.id
                                },
                                referenceId=self.id + "-manager",
                                image="worker",
                                cpuRequest="100m",
                                cpuLimit=None,
                                memoryRequest="350Mi",
                                memoryLimit="2048Mi"
                                )
        return job


    def runJob(self):
        configData = loadCloudConfiguration()

        job = self.createKubernetesJobObject()

        if configData['features']['enableRuns']:
            if not configData['features']['localRuns'] and job.doesJobStillExist():
                job.cleanup()

            job.start()


    def updatePredictedEndTime(self):
        ratio = 1.0

        if self.configuration.maxParallelSessions < 120:
            ratio = 120 / self.configuration.maxParallelSessions

        portionComplete = self.testingSessionsCompleted / self.configuration.totalTestingSessions

        self.predictedEndTime = self.startTime + relativedelta(hours=int(math.ceil(self.configuration.hours * (1.0 - portionComplete)) * ratio) + 1, minute=30, second=0, microsecond=0)


    def unencryptedJSON(self):
        data = json.loads(self.to_json())
        for key, fieldType in TestingRun.__dict__.items():
            if isinstance(fieldType, EncryptedStringField) and key in data:
                data[key] = EncryptedStringField.decrypt(data[key])

        if 'configuration' in data and self.configuration is not None:
            data['configuration'] = self.configuration.unencryptedJSON()

        return data
