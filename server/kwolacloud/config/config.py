#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import pkg_resources
import os
import json
from kwola.config.config import KwolaCoreConfiguration
from google.cloud import secretmanager


def determineEnvironment():
    environment = os.getenv("KWOLA_ENV")

    if environment is None or environment == "":
        environment = "development"

    return environment

cachedConfig = None
def loadCloudConfiguration():
    global cachedConfig

    if cachedConfig is not None:
        return cachedConfig

    environment = determineEnvironment()

    client = secretmanager.SecretManagerServiceClient()

    # Build the resource name of the secret.
    name = client.secret_version_path("kwola-cloud", f"{environment}_environment_config", "latest")

    response = client.access_secret_version(request={"name": name})

    data = json.loads(response.payload.data.decode("UTF-8"))

    cachedConfig = data

    return data


def getKwolaConfigurationData():
    configFilePath = f"config/core/main.json"

    data = json.loads(pkg_resources.resource_string("kwolacloud", configFilePath))

    mainConfig = loadCloudConfiguration()

    data['mongo_uri'] = mainConfig['mongo']['uri']
    data['enable_google_cloud_logging'] = mainConfig['features']['enableGoogleCloudLogging']
    data['enable_slack_logging'] = mainConfig['features']['enableSlackLogging']

    return data



def getKwolaConfiguration():
    data = getKwolaConfigurationData()

    config = KwolaCoreConfiguration(data)

    return config




