#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#



from kwola.datamodels.CustomIDField import CustomIDField
from .RunConfiguration import RunConfiguration
from mongoengine import *
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from ..config.config import getKwolaConfiguration
from ..config.config import loadConfiguration



class TestingRun(Document):
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

    runningTrainingStepJobId = StringField()

    def saveToDisk(self, config):
        self.save()


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return TestingRun.objects(id=id).first()


    def runJob(self):
        from kwolacloud.components.utils.KubernetesJob import KubernetesJob
        
        configData = loadConfiguration()

        if configData['features']['localRuns']:
            job = ManagedTaskSubprocess(["python3", "-m", "kwolacloud.tasks.RunTestingLocal"], {
                "testingRunId": self.id
            }, timeout=1800, config=getKwolaConfiguration(), logId=None)
        else:
            job = KubernetesJob(module="kwolacloud.tasks.RunTesting",
                                data={
                                    "testingRunId": self.id
                                },
                                referenceId=self.id,
                                image="worker",
                                cpuRequest="100m",
                                cpuLimit=None,
                                memoryRequest="350Mi",
                                memoryLimit="2048Mi"
                                )
        if configData['features']['enableRuns']:
            job.start()

