


from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.DiskUtilities import saveObjectToDisk, loadObjectFromDisk
from kwolacloud.datamodels.RunConfiguration import RunConfiguration
from kwolacloud.datamodels.TestingRun import TestingRun
from kwola.config.config import getSharedGCSStorageClient
from kwolacloud.config.config import loadCloudConfiguration
from mongoengine import *
from selenium import webdriver
from selenium.webdriver.common.proxy import Proxy, ProxyType
from selenium.webdriver.chrome.options import Options
import selenium
import time
import selenium.common.exceptions
import cv2
import requests
import logging
from google.cloud import storage
import numpy
import json
import secrets
from datetime import datetime
from dateutil.relativedelta import relativedelta
from kwola.datamodels.EncryptedStringField import EncryptedStringField


class ApplicationModel(DynamicDocument):
    meta = {
        'indexes': [
            ('owner',),
            ('teamMembers',),
        ]
    }

    id = CustomIDField()

    owner = StringField(required=True)

    name = StringField(required=True)

    url = EncryptedStringField(required=True)

    status = StringField(default="active", enumerate=['active', 'deleted'])

    creationDate = DateTimeField()

    slackAccessToken = StringField(default=None)

    slackChannel = StringField(default=None)

    enableSlackNewTestingRunNotifications = BooleanField(default=True)

    enableSlackNewBugNotifications = BooleanField(default=True)

    enableSlackTestingRunCompletedNotifications = BooleanField(default=True)

    enableEmailNewTestingRunNotifications = BooleanField(default=True)

    enableEmailNewBugNotifications = BooleanField(default=True)

    enableEmailTestingRunCompletedNotifications = BooleanField(default=True)

    overrideNotificationEmail = StringField(default=None)

    jiraAccessToken = StringField(default=None)

    jiraRefreshToken = StringField(default=None)

    jiraCloudId = StringField(default=None)

    jiraProject = StringField(default=None)

    jiraIssueType = StringField(default=None)

    enablePushBugsToJIRA = BooleanField(default=True)

    # Deprecated
    hasFirstTestingRunLaunched = BooleanField(default=False)

    hasFirstTestingRunCompleted = BooleanField(default=False)

    # Deprecated
    hasSentSupportOfferEmail = BooleanField(default=False)

    hasSentFeedbackRequestEmail = BooleanField(default=False)

    defaultRunConfiguration = EmbeddedDocumentField(RunConfiguration)

    testingRunStartedWebhookURL = StringField(default="")

    testingRunFinishedWebhookURL = StringField(default="")

    browserSessionWillStartWebhookURL = StringField(default="")

    browserSessionFinishedWebhookURL = StringField(default="")

    bugFoundWebhookURL = StringField(default="")

    webhookSignatureSecret = StringField(default="")

    stripeSubscriptionId = StringField(default=None)

    stripeCustomerId = StringField(default=None)

    package = StringField(default=None)

    promoCode = StringField(default=None)

    lastTestingDate = DateTimeField(default=None)

    teamMembers = StringField(default=None)

    def saveToDisk(self, config):
        saveObjectToDisk(self, "applications", config)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(ApplicationModel, id, "applications", config, printErrorOnFailure=printErrorOnFailure)


    def fetchScreenshot(self):
        storage_client = getSharedGCSStorageClient()

        bucket = storage_client.lookup_bucket("kwola-application-screenshots")
        blob = bucket.blob(self.id)
        if blob.exists():
            return blob.download_as_string()
        else:
            chrome_options = Options()
            chrome_options.headless = True

            driver = webdriver.Chrome(chrome_options=chrome_options)
            driver.set_page_load_timeout(20)
            try:
                driver.get(self.url)
                time.sleep(0.50)
            except selenium.common.exceptions.TimeoutException:
                pass
            screenshotData = driver.get_screenshot_as_png()
            driver.quit()

            # Check to see if this screenshot is good. Sometimes due to the timeouts, the image comes up
            # all white. We don't want to store that version in blob storage
            loadedScreenshot = cv2.imdecode(numpy.frombuffer(screenshotData, numpy.uint8), -1)

            colors = set(tuple(color) for row in loadedScreenshot for color in row)

            if len(colors) > 1:
                blob.upload_from_string(screenshotData, content_type="image/png")

            return screenshotData

    def refreshJiraAccessToken(self):
        config = loadCloudConfiguration()

        response = requests.post("https://auth.atlassian.com/oauth/token", {
            "refresh_token": self.jiraRefreshToken,
            "grant_type": "refresh_token",
            "client_id": config['jira']['clientId'],
            "client_secret": config['jira']['clientSecret']
        })

        if response.status_code != 200:
            logging.error(f"Error while refreshing JIRA access token with the refresh token! Status code: {response.status_code}. Text: {response.text}")
            self.jiraAccessToken = None
            self.jiraRefreshToken = None
            return False
        else:
            self.jiraAccessToken = response.json()['access_token']
            return True

    def generateWebhookSignatureSecret(self):
        self.webhookSignatureSecret = secrets.token_urlsafe(32)

    def countTestingRunsLaunchedThisMonth(self):
        return TestingRun.objects(
            startTime__gt=(datetime.now() + relativedelta(day=1, hour=0, minute=0, second=0, microsecond=0)),
            status__ne="failed"
        ).count()

    def checkSubscriptionLaunchRunAllowed(self):
        if self.package == "once" or self.package is None:
            return False

        if self.package == "monthly":
            return True

        return True

    def unencryptedJSON(self):
        data = json.loads(self.to_json())
        for key, fieldType in ApplicationModel.__dict__.items():
            if isinstance(fieldType, EncryptedStringField) and key in data:
                data[key] = EncryptedStringField.decrypt(data[key])

        if 'defaultRunConfiguration' in data and self.defaultRunConfiguration is not None:
            data['defaultRunConfiguration'] = self.defaultRunConfiguration.unencryptedJSON()

        return data

    @staticmethod
    def checkIfUserCanAccessApplication(user, applicationId):
        count = ApplicationModel.objects(Q(teamMembers__in=user) | Q(owner=user), id=applicationId).count()
        return count > 0

