


from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.DiskUtilities import saveObjectToDisk, loadObjectFromDisk
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


class ApplicationModel(Document):
    meta = {
        'indexes': [
            ('owner',),
        ]
    }

    id = CustomIDField()

    owner = StringField(required=True)

    name = StringField(required=True)

    url = StringField(required=True)

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

    def saveToDisk(self, config):
        saveObjectToDisk(self, "applications", config)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(ApplicationModel, id, "applications", config, printErrorOnFailure=printErrorOnFailure)


    def fetchScreenshot(self):
        storage_client = storage.Client()

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
        response = requests.post("https://auth.atlassian.com/oauth/token", {
            "refresh_token": self.jiraRefreshToken,
            "grant_type": "refresh_token",
            "client_id": "V5H8QVarAt0oytdolmjMzoIIrmRc1i41",
            "client_secret": "rNzHZLKqiB1DNp0Mv3bw7nQ_DngMepAt6vTViWJEA6ekf1f904whaWPNxhR0C3Ji"
        })

        if response.status_code != 200:
            logging.error(f"Error while refreshing JIRA access token with the refresh token! Status code: {response.status_code}. Text: {response.text}")
            self.jiraAccessToken = None
            self.jiraRefreshToken = None
            return False
        else:
            self.jiraAccessToken = response.json()['access_token']
            return True
