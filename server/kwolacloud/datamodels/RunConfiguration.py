#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from ..config.config import getKwolaConfigurationData
from kwola.config.config import KwolaCoreConfiguration


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

    enableFirefox = BooleanField(default=False)

    enableEdge = BooleanField(default=False)

    enableWindowSizeDesktop = BooleanField(default=True)

    enableWindowSizeTablet = BooleanField(default=False)

    enableWindowSizeMobile = BooleanField(default=False)

    def createKwolaCoreConfiguration(self, applicationId):
        runConfiguration = self.run.configuration

        kwolaConfigData = getKwolaConfigurationData()

        kwolaConfigData['applicationId'] = self.run.applicationId
        kwolaConfigData['url'] = runConfiguration.url
        kwolaConfigData['email'] = runConfiguration.email
        kwolaConfigData['password'] = runConfiguration.password
        kwolaConfigData['name'] = runConfiguration.name
        kwolaConfigData['paragraph'] = runConfiguration.paragraph
        kwolaConfigData['enableRandomNumberCommand'] = runConfiguration.enableRandomNumberCommand
        kwolaConfigData['enableRandomBracketCommand'] = runConfiguration.enableRandomBracketCommand
        kwolaConfigData['enableRandomMathCommand'] = runConfiguration.enableRandomMathCommand
        kwolaConfigData['enableRandomOtherSymbolCommand'] = runConfiguration.enableRandomOtherSymbolCommand
        kwolaConfigData['enableDoubleClickCommand'] = runConfiguration.enableDoubleClickCommand
        kwolaConfigData['enableRightClickCommand'] = runConfiguration.enableRightClickCommand
        kwolaConfigData['enableTypeEmail'] = runConfiguration.enableTypeEmail
        kwolaConfigData['enableTypePassword'] = runConfiguration.enableTypePassword
        kwolaConfigData['enableScrolling'] = runConfiguration.enableScrolling
        kwolaConfigData['enableRandomLettersCommand'] = runConfiguration.enableRandomLettersCommand
        kwolaConfigData['enableRandomAddressCommand'] = runConfiguration.enableRandomAddressCommand
        kwolaConfigData['enableRandomEmailCommand'] = runConfiguration.enableRandomEmailCommand
        kwolaConfigData['enableRandomPhoneNumberCommand'] = runConfiguration.enableRandomPhoneNumberCommand
        kwolaConfigData['enableRandomParagraphCommand'] = runConfiguration.enableRandomParagraphCommand
        kwolaConfigData['enableRandomDateTimeCommand'] = runConfiguration.enableRandomDateTimeCommand
        kwolaConfigData['enableRandomCreditCardCommand'] = runConfiguration.enableRandomCreditCardCommand
        kwolaConfigData['enableRandomURLCommand'] = runConfiguration.enableRandomURLCommand
        kwolaConfigData['autologin'] = runConfiguration.autologin
        kwolaConfigData['prevent_offsite_links'] = runConfiguration.preventOffsiteLinks
        kwolaConfigData['testing_sequence_length'] = runConfiguration.testingSequenceLength
        if runConfiguration.enablePathWhitelist:
            kwolaConfigData['web_session_restrict_url_to_regexes'] = runConfiguration.urlWhitelistRegexes
        else:
            kwolaConfigData['web_session_restrict_url_to_regexes'] = []
        kwolaConfigData['custom_typing_action_strings'] = runConfiguration.customTypingActionStrings
        kwolaConfigData['enable_5xx_error'] = runConfiguration.enable5xxError
        kwolaConfigData['enable_400_error'] = runConfiguration.enable400Error
        kwolaConfigData['enable_401_error'] = runConfiguration.enable401Error
        kwolaConfigData['enable_403_error'] = runConfiguration.enable403Error
        kwolaConfigData['enable_404_error'] = runConfiguration.enable404Error
        kwolaConfigData['enable_javascript_console_error'] = runConfiguration.enableJavascriptConsoleError
        kwolaConfigData['enable_unhandled_exception_error'] = runConfiguration.enableUnhandledExceptionError
        kwolaConfigData['web_session_enable_chrome'] = runConfiguration.enableChrome
        kwolaConfigData['web_session_enable_firefox'] = runConfiguration.enableFirefox
        kwolaConfigData['web_session_enable_edge'] = runConfiguration.enableEdge
        kwolaConfigData['web_session_enable_window_size_desktop'] = runConfiguration.enableWindowSizeDesktop
        kwolaConfigData['web_session_enable_window_size_tablet'] = runConfiguration.enableWindowSizeTablet
        kwolaConfigData['web_session_enable_window_size_mobile'] = runConfiguration.enableWindowSizeMobile

        return KwolaCoreConfiguration(kwolaConfigData)
