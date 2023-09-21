#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.errors.BaseError import BaseError



class MutedError(DynamicDocument):
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
