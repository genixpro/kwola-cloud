#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.TypingActionConfiguration import TypingActionConfiguration
from ..config.config import getKwolaConfigurationData, loadCloudConfiguration
from kwola.config.config import KwolaCoreConfiguration
import json
import os


class RunConfiguration(EmbeddedDocument):
    url = StringField()

    email = StringField()

    password = StringField()

    name = StringField()

    paragraph = StringField()

    # Deprecated
    enableRandomNumberCommand = BooleanField(default=False)

    # Deprecated
    enableRandomBracketCommand = BooleanField(default=False)

    # Deprecated
    enableRandomMathCommand = BooleanField(default=False)

    # Deprecated
    enableRandomOtherSymbolCommand = BooleanField(default=False)

    enableDoubleClickCommand = BooleanField(default=False)

    enableRightClickCommand = BooleanField(default=False)

    # Deprecated
    enableTypeEmail = BooleanField(default=False)

    # Deprecated
    enableTypePassword = BooleanField(default=False)

    # Deprecated
    enableRandomLettersCommand = BooleanField(default=False)

    # Deprecated
    enableRandomAddressCommand = BooleanField(default=False)

    # Deprecated
    enableRandomEmailCommand = BooleanField(default=False)

    # Deprecated
    enableRandomPhoneNumberCommand = BooleanField(default=False)

    # Deprecated
    enableRandomParagraphCommand = BooleanField(default=False)

    # Deprecated
    enableRandomDateTimeCommand = BooleanField(default=False)

    # Deprecated
    enableRandomCreditCardCommand = BooleanField(default=False)

    # Deprecated
    enableRandomURLCommand = BooleanField(default=False)

    enableScrolling = BooleanField(default=True)

    # Unused
    enableDragging = BooleanField()

    # Deprecated
    customTypingActionStrings = ListField(StringField())

    typingActions = ListField(EmbeddedDocumentField(TypingActionConfiguration))

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

    enableFirefox = BooleanField(default=False)

    enableEdge = BooleanField(default=False)

    enableWindowSizeDesktop = BooleanField(default=True)

    enableWindowSizeTablet = BooleanField(default=False)

    enableWindowSizeMobile = BooleanField(default=False)

    def createKwolaCoreConfiguration(self, owner, applicationId, testingRunId):
        kwolaConfigData = getKwolaConfigurationData()

        kwolaConfigData['owner'] = owner
        kwolaConfigData['applicationId'] = applicationId
        kwolaConfigData['testingRunId'] = testingRunId
        kwolaConfigData['url'] = self.url
        kwolaConfigData['email'] = self.email
        kwolaConfigData['password'] = self.password
        kwolaConfigData['name'] = self.name
        kwolaConfigData['paragraph'] = self.paragraph
        kwolaConfigData['enableRandomNumberCommand'] = self.enableRandomNumberCommand
        kwolaConfigData['enableRandomBracketCommand'] = self.enableRandomBracketCommand
        kwolaConfigData['enableRandomMathCommand'] = self.enableRandomMathCommand
        kwolaConfigData['enableRandomOtherSymbolCommand'] = self.enableRandomOtherSymbolCommand
        kwolaConfigData['enableDoubleClickCommand'] = self.enableDoubleClickCommand
        kwolaConfigData['enableRightClickCommand'] = self.enableRightClickCommand
        kwolaConfigData['enableTypeEmail'] = self.enableTypeEmail
        kwolaConfigData['enableTypePassword'] = self.enableTypePassword
        kwolaConfigData['enableScrolling'] = self.enableScrolling
        kwolaConfigData['enableRandomLettersCommand'] = self.enableRandomLettersCommand
        kwolaConfigData['enableRandomAddressCommand'] = self.enableRandomAddressCommand
        kwolaConfigData['enableRandomEmailCommand'] = self.enableRandomEmailCommand
        kwolaConfigData['enableRandomPhoneNumberCommand'] = self.enableRandomPhoneNumberCommand
        kwolaConfigData['enableRandomParagraphCommand'] = self.enableRandomParagraphCommand
        kwolaConfigData['enableRandomDateTimeCommand'] = self.enableRandomDateTimeCommand
        kwolaConfigData['enableRandomCreditCardCommand'] = self.enableRandomCreditCardCommand
        kwolaConfigData['enableRandomURLCommand'] = self.enableRandomURLCommand
        kwolaConfigData['autologin'] = self.autologin
        kwolaConfigData['prevent_offsite_links'] = self.preventOffsiteLinks
        kwolaConfigData['testing_sequence_length'] = self.testingSequenceLength
        if self.enablePathWhitelist:
            kwolaConfigData['web_session_restrict_url_to_regexes'] = self.urlWhitelistRegexes
        else:
            kwolaConfigData['web_session_restrict_url_to_regexes'] = []
        kwolaConfigData['custom_typing_action_strings'] = self.customTypingActionStrings
        kwolaConfigData['enable_5xx_error'] = self.enable5xxError
        kwolaConfigData['enable_400_error'] = self.enable400Error
        kwolaConfigData['enable_401_error'] = self.enable401Error
        kwolaConfigData['enable_403_error'] = self.enable403Error
        kwolaConfigData['enable_404_error'] = self.enable404Error
        kwolaConfigData['enable_javascript_console_error'] = self.enableJavascriptConsoleError
        kwolaConfigData['enable_unhandled_exception_error'] = self.enableUnhandledExceptionError
        kwolaConfigData['web_session_enable_chrome'] = self.enableChrome
        kwolaConfigData['web_session_enable_firefox'] = self.enableFirefox
        kwolaConfigData['web_session_enable_edge'] = self.enableEdge
        kwolaConfigData['web_session_enable_window_size_desktop'] = self.enableWindowSizeDesktop
        kwolaConfigData['web_session_enable_window_size_tablet'] = self.enableWindowSizeTablet
        kwolaConfigData['web_session_enable_window_size_mobile'] = self.enableWindowSizeMobile
        kwolaConfigData['typing_actions'] = [
            json.loads(action.to_json()) for action in self.typingActions
        ]

        cloudConfig = loadCloudConfiguration()
        if cloudConfig['features']['localRuns']:
            kwolaConfigData['configurationDirectory'] = os.path.join("data", applicationId)

        return KwolaCoreConfiguration(kwolaConfigData)
