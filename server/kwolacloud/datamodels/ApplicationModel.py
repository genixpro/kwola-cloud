


from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.DiskUtilities import saveObjectToDisk, loadObjectFromDisk
from mongoengine import *


class ApplicationModel(Document):
    meta = {
        'indexes': [
            ('owner',),
        ]
    }

    id = CustomIDField()

    owner = StringField(required=True)

    name = StringField(required=True)

    url = StringField(required=True)

    def saveToDisk(self, config):
        saveObjectToDisk(self, "applications", config)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(ApplicationModel, id, "applications", config, printErrorOnFailure=printErrorOnFailure)


