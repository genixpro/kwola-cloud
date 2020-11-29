from .config.config import loadCloudConfiguration
from mongoengine import connect
import time
from .datamodels.ApplicationModel import ApplicationModel


def connectToMongoWithRetries(alias=None, db=None):
    configData = loadCloudConfiguration()

    success = False
    lastError = None
    for attempts in range(10):
        try:
            if db is None:
                db = configData['mongo']['db']

            uri = configData['mongo']['uri'].replace(configData['mongo']['db'], db)
            if alias is None:
                connect(db, host=uri)
            else:
                connect(db, host=uri, alias=alias)
            ApplicationModel.objects().count()
            success = True
            break
        except Exception as e:
            time.sleep(1.5**attempts)
            lastError = e
            continue
    if not success:
        raise lastError

