from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField


class GmailMarketingToken(Document):
    id = CustomIDField()

    token = StringField()

