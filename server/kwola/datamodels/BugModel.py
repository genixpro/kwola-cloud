#
#     Kwola is an AI algorithm that learns how to use other programs
#     automatically so that it can find bugs in them.
#
#     Copyright (C) 2020 Kwola Software Testing Inc.
#
#     This program is free software: you can redistribute it and/or modify
#     it under the terms of the GNU Affero General Public License as
#     published by the Free Software Foundation, either version 3 of the
#     License, or (at your option) any later version.
#
#     This program is distributed in the hope that it will be useful,
#     but WITHOUT ANY WARRANTY; without even the implied warranty of
#     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#     GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with this program.  If not, see <https://www.gnu.org/licenses/>.
#


from .errors.BaseError import BaseError
from .errors.ExceptionError import ExceptionError
from .errors.HttpError import HttpError
from .errors.LogError import LogError
from .actions.BaseAction import BaseAction
from .CustomIDField import CustomIDField
from .DiskUtilities import saveObjectToDisk, loadObjectFromDisk
from mongoengine import *

class BugModel(Document):
    id = CustomIDField()

    owner = StringField()

    applicationId = StringField()

    testingStepId = StringField()

    testingRunId = StringField(required=False)

    executionSessionId = StringField()

    creationDate = DateField()

    stepNumber = IntField()

    actionsPerformed = EmbeddedDocumentListField(BaseAction)

    error = EmbeddedDocumentField(BaseError)

    isMuted = BooleanField(default=False)

    mutedErrorId = StringField(default=None)

    reproductionTraces = ListField(StringField())

    browser = StringField()

    userAgent = StringField()

    windowSize = StringField()

    isJavascriptError = BooleanField()

    severityScore = StringField()

    severityLevel = StringField()

    def saveToDisk(self, config, overrideSaveFormat=None, overrideCompression=None):
        saveObjectToDisk(self, "bugs", config, overrideSaveFormat=overrideSaveFormat, overrideCompression=overrideCompression)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(BugModel, id, "bugs", config, printErrorOnFailure=printErrorOnFailure)

    def generateBugText(self):
        return self.error.generateErrorDescription()

    def isDuplicateOf(self, otherBug):
        return self.error.isDuplicateOf(otherBug.error)

    def recomputeBugQualitativeFeatures(self):
        self.recomputeIsJavascriptError()

    def recomputeIsJavascriptError(self):
        self.isJavascriptError = False
        if isinstance(self.error, ExceptionError):
            self.isJavascriptError = True
        elif isinstance(self.error, LogError):

            javascriptErrorTexts = [
                'null',
                'RangeError',
                'ReferenceError',
                'SyntaxError',
                'TypeError',
                'undefined',
                'URIError',
                'Exception'
            ]

            for text in javascriptErrorTexts:
                if text in self.error.message:
                    self.isJavascriptError = True
                    break

    def recomputeSeverityScore(self):
        if self.isJavascriptError:
            self.severityScore = 10
        elif isinstance(self.error, HttpError) and self.error.statusCode >= 500:
            self.severityScore = 9
        elif isinstance(self.error, HttpError) and (self.error.statusCode == 403 or self.error.statusCode == 401):
            self.severityScore = 8
        elif isinstance(self.error, HttpError) and self.error.statusCode == 404:
            self.severityScore = 5
        elif isinstance(self.error, LogError):
            self.severityScore = 4
        else:
            self.severityScore = 0
