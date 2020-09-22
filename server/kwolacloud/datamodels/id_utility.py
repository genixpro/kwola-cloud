import base64
import uuid
import re
import datetime
import hashlib
import random
from .Counter import CounterModel
from ..config.config import loadConfiguration

def generateKwolaId(modelClass, owner, kwolaConfig, groupIndex=None):
    serverConfig = loadConfiguration()

    prefix = generateModelNameShorthand(modelClass) + "-" + \
             generateRandomLowercaseLetter() + \
             generateRandomAlphanum() + \
             generateRandomAlphanum() + \
             generateRandomAlphanum() + "-" + \
             generateRandomLowercaseLetter() + \
             generateRandomAlphanum() + \
             generateRandomAlphanum() + \
             generateRandomAlphanum() + "-" + \
             generateHourCode() + \
             generateDayCode() + \
             generateMonthCode() + \
             generateYearCode() + "-" + \
             generateEnvironmentShorthand(serverConfig) + \
             generateUserCode(owner, serverConfig) + "-" + \
             generateObjectCounterValueCode(modelClass, owner, length=4, groupIndex=groupIndex)

    currentLength = 0
    randomPartIncrementLength = 4
    generatedId = prefix
    while modelClass.loadFromDisk(generatedId, kwolaConfig, printErrorOnFailure=False) is not None:
        currentLength += randomPartIncrementLength
        generatedId = prefix + "_" + generateRandomAlphanumericCode(currentLength)

    return generatedId

def generateRandomAlphanumericCode(length):
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('ascii').replace("_", "").replace("-", "")[:length].lower()

def generateRandomLowercaseLetter():
    return random.choice(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'])

def generateRandomAlphanum():
    return random.choice(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
                          's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

def generateRandomDigit():
    return random.choice(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])


def generateModelNameShorthand(modelClass):
    modelName = modelClass.__name__
    modelName = modelName.replace("Model", "")
    pattern = '([A-Z][a-z])'
    matches = re.findall(pattern, modelName)
    return ''.join(matches).lower()[:4]


def generateEnvironmentShorthand(serverConfig):
    return serverConfig['environmentCode']


def generateYearCode():
    year = datetime.datetime.now().year
    kwolaFoundingYear = 2020
    yearDigit = year - kwolaFoundingYear
    return getOneDigitCode(yearDigit)

def generateMonthCode():
    return getOneDigitCode(datetime.datetime.now().month)

def generateDayCode():
    return getOneDigitCode(datetime.datetime.now().day)

def generateHourCode():
    hour = datetime.datetime.now().hour

    if hour >= 12:
        hour -= 12

    return getOneDigitCode(hour)


oneDigitCodeCharacters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
def getOneDigitCode(value):
    assert value >= 0 and value <= 60
    return oneDigitCodeCharacters[value]



def generateObjectCounterValueCode(modelClass, owner, length, groupIndex=None):
    queryParameters = {}
    queryParameters['className'] = modelClass.__name__
    queryParameters['owner'] = owner

    if groupIndex is not None:
        queryParameters['groupIndex'] = groupIndex

    counterObject = CounterModel.objects(**queryParameters).upsert_one(inc__counter=1)

    counterStr = str(counterObject.counter)

    while len(counterStr) < length:
        counterStr = "0" + counterStr

    return counterStr[-length:]



def generateUserCode(owner, config):
    salt = config['userCodeSalt']

    return computeShortHash(data=owner, salt=salt, length=3)



def computeShortHash(data, salt, length):
    hasher = hashlib.sha256()
    hasher.update(bytes(data, 'utf8'))
    hasher.update(bytes(salt, 'utf8'))

    base64ExtraCharacters = bytes("--", 'utf8')
    longHash = str(base64.b64encode(hasher.digest(), altchars=base64ExtraCharacters), 'utf8')
    longHash = longHash.replace("-", "")
    longHash = longHash.replace("=", "")

    shortHash = longHash[::int(len(longHash) / length)].lower()

    while len(shortHash) < length:
        shortHash += "0"

    return shortHash[:length]

