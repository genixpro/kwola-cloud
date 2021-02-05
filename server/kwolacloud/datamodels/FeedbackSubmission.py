from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField


class FeedbackSubmission(DynamicDocument):
    meta = {
        'indexes': [
            ('owner',)
        ]
    }

    id = CustomIDField()


    owner = StringField(required=True)

    creationDate = DateField()

    applicationId = StringField()

    testingRunId = StringField()

    screen = StringField()

    valence = StringField(enumerate=[None, 'good', 'bad'])

    text = StringField()



    def saveToDisk(self, config):
        self.save()

    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return FeedbackSubmission.objects(id=id).first()
