from .config.config import loadConfiguration
from mongoengine import connect
import time
from .datamodels.ApplicationModel import ApplicationModel


def connectToMongoWithRetries():
    configData = loadConfiguration()

    success = False
    lastError = None
    for attempts in range(10):
        try:
            connect(configData['mongo']['db'], host=configData['mongo']['uri'])
            ApplicationModel.objects().count()
            success = True
            break
        except Exception as e:
            time.sleep(1.5**attempts)
            lastError = e
            continue
    if not success:
        raise lastError

