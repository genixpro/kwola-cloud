from auth0.v3.authentication import GetToken
from auth0.v3.management import Auth0
from kwolacloud.config.config import loadConfiguration
import time

authService = None

def loadAuth0Service():
    global authService

    configData = loadConfiguration()

    domain = configData['auth0']['domain'].replace("https://", "")

    get_token = GetToken(domain)
    token = get_token.client_credentials(configData['auth0']['mgmtClientId'], configData['auth0']['mgmtClientSecret'], 'https://{}/api/v2/'.format(domain))
    mgmt_api_token = token['access_token']

    authService = Auth0(domain, mgmt_api_token)

    return authService

def getUserProfileFromId(ownerId):
    global authService

    maxAttempts = 5
    for attempt in range(maxAttempts):
        try:
            if authService is None:
                authService = loadAuth0Service()

            return authService.users.get(ownerId)
        except Exception as e:
            authService = None
            if attempt == maxAttempts - 1:
                raise
            else:
                time.sleep(2**attempt)


