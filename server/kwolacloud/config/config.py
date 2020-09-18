#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

import pkg_resources
import os
import json
from kwola.config.config import KwolaCoreConfiguration

def determineEnvironment():
    environment = os.getenv("KWOLA_ENV")

    if environment is None or environment == "":
        environment = "development"

    return environment

cachedConfig = None
def loadConfiguration():
    global cachedConfig

    if cachedConfig is not None:
        return cachedConfig

    environment = determineEnvironment()

    configFilePath = f"config/environments/{environment}.json"

    data = json.loads(pkg_resources.resource_string("kwolacloud", configFilePath))

    cachedConfig = data

    return data


def getKwolaConfigurationData():
    configFilePath = f"config/core/main.json"

    data = json.loads(pkg_resources.resource_string("kwolacloud", configFilePath))

    mainConfig = loadConfiguration()

    data['mongo_uri'] = mainConfig['mongo']['uri']

    return data



def getKwolaConfiguration():
    data = getKwolaConfigurationData()

    config = KwolaCoreConfiguration(configData=data)

    return config




