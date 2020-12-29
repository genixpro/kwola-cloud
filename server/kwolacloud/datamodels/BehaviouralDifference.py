from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.DiskUtilities import saveObjectToDisk, loadObjectFromDisk
import hashlib

class BehaviouralDifference(Document):
    meta = {
        'indexes': [
            ('owner', 'applicationId'),
            ('priorTestingRunId',),
            ('newTestingRunId',),
            ('newExecutionSessionId',),
            ('newExecutionTraceId',)
        ]
    }

    id = CustomIDField()

    owner = StringField(required=True)

    applicationId = StringField()

    priorTestingRunId = StringField()

    newTestingRunId = StringField()

    priorExecutionSessionId = StringField()

    newExecutionSessionId = StringField()

    priorExecutionTraceId = StringField()

    newExecutionTraceId = StringField()

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

    isDuplicate = BooleanField()

    def saveToDisk(self, config):
        saveObjectToDisk(self, "behavioural_differences", config)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(BehaviouralDifference, id, "behavioural_differences", config, printErrorOnFailure=printErrorOnFailure)


    def computeDifferenceHash(self):
        hasher = hashlib.sha256()
        hasher.update(bytes(str(self.differenceType), "utf8"))

        if self.differenceType == "changed_text" or self.differenceType == "deleted_text":
            hasher.update(bytes(str(int(self.priorLeft/10)), "utf8"))
            hasher.update(bytes(str(int(self.priorTop/10)), "utf8"))
            hasher.update(bytes(str(int(self.priorBottom/10)), "utf8"))
            hasher.update(bytes(str(int(self.priorRight/10)), "utf8"))
            hasher.update(bytes(str(self.priorText), "utf8"))

        if self.differenceType == "changed_text" or self.differenceType == "added_text":
            hasher.update(bytes(str(int(self.newLeft/10)), "utf8"))
            hasher.update(bytes(str(int(self.newTop/10)), "utf8"))
            hasher.update(bytes(str(int(self.newBottom/10)), "utf8"))
            hasher.update(bytes(str(int(self.newRight/10)), "utf8"))
            hasher.update(bytes(str(self.newText), "utf8"))

        return hasher.hexdigest()