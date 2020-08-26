#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.errors.BaseError import BaseError



class MutedError(Document):
    id = CustomIDField()

    owner = StringField()

    applicationId = StringField()

    error = EmbeddedDocumentField(BaseError)

    creationDate = DateField()

    totalOccurrences = IntField()

    mostRecentOccurrence = DateField()


    def saveToDisk(self, config):
        self.save()

    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return MutedError.objects(id=id).first()
