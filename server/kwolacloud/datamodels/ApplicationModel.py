


from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.DiskUtilities import saveObjectToDisk, loadObjectFromDisk
from mongoengine import *
from selenium import webdriver
from selenium.webdriver.common.proxy import Proxy, ProxyType
from selenium.webdriver.chrome.options import Options
import selenium
import time
import selenium.common.exceptions


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

    def saveToDisk(self, config):
        saveObjectToDisk(self, "applications", config)


    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return loadObjectFromDisk(ApplicationModel, id, "applications", config, printErrorOnFailure=printErrorOnFailure)


    def fetchScreenshot(self):
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
        return screenshotData
