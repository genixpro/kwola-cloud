#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField



class RunConfiguration(EmbeddedDocument):
    url = StringField()

    email = StringField()

    password = StringField()

    name = StringField()

    paragraph = StringField()

    enableRandomNumberCommand = BooleanField()

    enableRandomBracketCommand = BooleanField()

    enableRandomMathCommand = BooleanField()

    enableRandomOtherSymbolCommand = BooleanField()

    enableDoubleClickCommand = BooleanField()

    enableRightClickCommand = BooleanField()

    autologin = BooleanField()

    preventOffsiteLinks = BooleanField()

    urlWhitelistRegexes = ListField(StringField())

    testingSequenceLength = IntField()

    totalTestingSessions = IntField()

    hours = IntField()
