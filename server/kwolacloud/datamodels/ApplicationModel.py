


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

    jiraCloudId = StringField(default=None)

    jiraProject = StringField(default=None)

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
