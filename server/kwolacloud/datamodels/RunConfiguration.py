#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField



class RunConfiguration(EmbeddedDocument):
    id = CustomIDField()

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

    testingSequenceLength = IntField()

    numberOfParallelTestingSessions = IntField()

