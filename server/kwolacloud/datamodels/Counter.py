from mongoengine import *


class CounterModel(Document):
    meta = {
        'indexes': [
            ('owner', 'className', 'groupIndex', 'counter')
        ]
    }

    owner = StringField(required=True)

    className = StringField(required=True)

    groupIndex = IntField(default=None, required=False)

    counter = IntField(default=0, required=True)

