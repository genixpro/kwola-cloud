from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.DiskUtilities import saveObjectToDisk, loadObjectFromDisk

class RegressionDifference(Document):
    meta = {
        'indexes': [
            ('owner', 'applicationId'),
            ('priorTestingRunId',),
            ('newTestingRunId',)
        ]
    }

    id = CustomIDField()

    owner = StringField(required=True)

    applicationId = StringField()

    priorTestingRunId = StringField()

    newTestingRunId = StringField()

    differenceType = StringField()

    priorLeft = FloatField()

    priorTop = FloatField()

    priorBottom = FloatField()

    priorRight = FloatField()

    newLeft = FloatField()

    newTop = FloatField()

    newBottom = FloatField()

    newRight = FloatField()

    priorText = StringField()

    newText = StringField()


    def saveToDisk(self, config):
        saveObjectToDisk(self, "regression_differences", config)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(RegressionDifference, id, "regression_differences", config, printErrorOnFailure=printErrorOnFailure)