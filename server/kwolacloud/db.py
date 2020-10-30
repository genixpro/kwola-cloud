from .config.config import loadConfiguration
from mongoengine import connect
import time
from .datamodels.ApplicationModel import ApplicationModel


def connectToMongoWithRetries(alias=None, db=None):
    configData = loadConfiguration()

    success = False
    lastError = None
    for attempts in range(10):
        try:
            if db is None:
                db = configData['mongo']['db']

            if alias is None:
                connect(db, host=configData['mongo']['uri'])
            else:
                connect(db, host=configData['mongo']['uri'], alias=alias)
            ApplicationModel.objects().count()
            success = True
            break
        except Exception as e:
            time.sleep(1.5**attempts)
            lastError = e
            continue
    if not success:
        raise lastError

