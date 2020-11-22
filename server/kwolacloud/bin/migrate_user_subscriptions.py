from ..helpers.auth0 import loadAuth0Service, updateUserProfileMetadataValue
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess
from kwola.config.logger import getLogger
from kwola.components.utils.retry import autoretry
from pprint import pprint
import time

@autoretry()
def migrateUser(user):
    updateUserProfileMetadataValue(user['user_id'], "subscriptionPackageMode", "package_100")
    getLogger().info(f"Updated user {user['user_id']} to the new package.")


@autoretry()
def migrateUserSubscriptions():
    authService = loadAuth0Service()

    page = 0
    users = authService.users.list()['users']
    while len(users):
        users = authService.users.list(page=page)['users']
        page += 1
        for user in users:
            if 'user_metadata' not in user or 'subscriptionPackageMode' not in user['user_metadata']:
                migrateUser(user)
            time.sleep(1)



def main():
    initializeKwolaCloudProcess()
    migrateUserSubscriptions()


