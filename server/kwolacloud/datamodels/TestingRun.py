#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#



from kwola.datamodels.CustomIDField import CustomIDField
from .RunConfiguration import RunConfiguration
from mongoengine import *



class TestingRun(Document):
    meta = {
        'indexes': [
            ('owner',),
            ('owner', 'applicationId'),
        ]
    }

    id = CustomIDField()

    owner = StringField()

    applicationId = StringField()

    stripeSubscriptionId = StringField()

    configuration = EmbeddedDocumentField(RunConfiguration)

    status = StringField()

    startTime = DateTimeField()

    endTime = DateTimeField()

    testingSessionsRemaining = IntField(default=0)

    testingSessionsCompleted = IntField(default=0)

    trainingStepsCompleted = IntField(default=0)

    initializationTestingSteps = ListField(StringField())

    testingSteps = ListField(StringField())

    trainingSteps = ListField(StringField())

    averageTimePerStep = FloatField(default=0)

    def saveToDisk(self, config):
        self.save()


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return TestingRun.objects(id=id).first()


