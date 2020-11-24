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

    enableRandomNumberCommand = BooleanField(default=True)

    enableRandomBracketCommand = BooleanField(default=False)

    enableRandomMathCommand = BooleanField(default=False)

    enableRandomOtherSymbolCommand = BooleanField(default=False)

    enableDoubleClickCommand = BooleanField(default=False)

    enableRightClickCommand = BooleanField(default=False)

    enableTypeEmail = BooleanField(default=False)

    enableTypePassword = BooleanField(default=False)

    enableRandomLettersCommand = BooleanField(default=True)

    enableRandomAddressCommand = BooleanField(default=True)

    enableRandomEmailCommand = BooleanField(default=True)

    enableRandomPhoneNumberCommand = BooleanField(default=True)

    enableRandomParagraphCommand = BooleanField(default=True)

    enableRandomDateTimeCommand = BooleanField(default=True)

    enableRandomCreditCardCommand = BooleanField(default=True)

    enableRandomURLCommand = BooleanField(default=False)

    enableScrolling = BooleanField(default=True)

    enableDragging = BooleanField()

    customTypingActionStrings = ListField(StringField())

    autologin = BooleanField()

    preventOffsiteLinks = BooleanField(default=True)

    enablePathWhitelist = BooleanField()

    urlWhitelistRegexes = ListField(StringField())

    testingSequenceLength = IntField()

    totalTestingSessions = IntField()

    hours = IntField()

    maxParallelSessions = IntField(default=250)

    enable5xxError = BooleanField(default=True)

    enable400Error = BooleanField(default=True)

    enable401Error = BooleanField(default=False)

    enable403Error = BooleanField(default=False)

    enable404Error = BooleanField(default=True)

    enableJavascriptConsoleError = BooleanField(default=True)

    enableUnhandledExceptionError = BooleanField(default=True)

    enableChrome = BooleanField(default=True)

    enableFirefox = BooleanField(default=True)

    enableEdge = BooleanField(default=True)

    enableWindowSizeDesktop = BooleanField(default=True)

    enableWindowSizeTablet = BooleanField(default=False)

    enableWindowSizeMobile = BooleanField(default=False)
