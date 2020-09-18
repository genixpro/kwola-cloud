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

    enableTypeEmail = BooleanField()

    enableTypePassword = BooleanField()

    enableScrolling = BooleanField()

    enableDragging = BooleanField()

    customTypingActionStrings = ListField(StringField())

    autologin = BooleanField()

    preventOffsiteLinks = BooleanField()

    urlWhitelistRegexes = ListField(StringField())

    testingSequenceLength = IntField()

    totalTestingSessions = IntField()

    hours = IntField()

    enable5xxError = BooleanField(default=True)

    enable400Error = BooleanField(default=True)

    enable401Error = BooleanField(default=False)

    enable403Error = BooleanField(default=False)

    enable404Error = BooleanField(default=True)

    enableJavascriptConsoleError = BooleanField(default=True)

    enableUnhandledExceptionError = BooleanField(default=True)
