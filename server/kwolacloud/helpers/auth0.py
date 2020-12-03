from auth0.v3.authentication import GetToken
from auth0.v3.management import Auth0
from kwolacloud.config.config import loadCloudConfiguration
import time
from kwola.components.utils.retry import autoretry
import datetime
from dateutil.relativedelta import relativedelta


authService = None

def loadAuth0Service():
    global authService

    configData = loadCloudConfiguration()

    domain = configData['auth0']['domain'].replace("https://", "")

    get_token = GetToken(domain)
    token = get_token.client_credentials(configData['auth0']['mgmtClientId'], configData['auth0']['mgmtClientSecret'], 'https://{}/api/v2/'.format(domain))
    mgmt_api_token = token['access_token']

    authService = Auth0(domain, mgmt_api_token)

    return authService

def resetAuthService(*args):
    global authService
    authService = None

@autoretry()
def getAccessTokenForTestingUser():
    configData = loadCloudConfiguration()

    domain = configData['auth0']['domain'].replace("https://", "")
    get_token = GetToken(domain)
    token = get_token.login(client_id=configData['auth0']['clientId'],
                            client_secret=configData['auth0']['clientSecret'],
                            username="testing@kwola.io",
                            password="kwola",
                            scope="openid profile email",
                            realm="",
                            grant_type="password",
                            audience='https://{}/api/v2/'.format(domain)
                            )

    return token

@autoretry(onFailure=resetAuthService)
def getUserProfileFromId(ownerId):
    global authService

    if authService is None:
        authService = loadAuth0Service()

    return authService.users.get(ownerId)


@autoretry(onFailure=resetAuthService)
def updateUserProfileMetadataValue(ownerId, key, value):
    global authService

    if authService is None:
        authService = loadAuth0Service()

    user = authService.users.get(ownerId)

    metadata = user.get('user_metadata', {})
    metadata[key] = value

    authService.users.update(ownerId, {"user_metadata": metadata})
