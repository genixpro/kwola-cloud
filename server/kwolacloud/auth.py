from jwcrypto.jws import JWS, JWSHeaderRegistry, JWK, InvalidJWSSignature, InvalidJWSObject, InvalidJWSOperation
from jwcrypto.jwt import JWT
from jwcrypto.common import base64url_encode, base64url_decode, \
                            json_encode, json_decode
from .config.config import loadConfiguration
import json
import pkg_resources
import flask

def authenticate(returnAllClaims=False):
    configData = loadConfiguration()

    if 'WWW-Authenticate' in flask.request.headers:
        token = flask.request.headers['WWW-Authenticate']
    elif 'token' in flask.request.args:
        token = flask.request.args['token']
    else:
        return None

    apiUrl = configData['auth0']['apiUrl']
    authDomain = configData['auth0']['domain']
    authKey = json.loads(pkg_resources.resource_string("kwolacloud", configData['auth0']['keyFile']))

    try:
        key = JWK(**authKey)

        token = JWT(jwt=token,
                    key=key,
                    check_claims={
                        'iss': authDomain,
                        # 'aud': apiUrl # TODO: need to figure out why the aud claim is all wonky in our jwt tokens.
                    },
                    algs=['RS256'])

        claims = json_decode(token.claims)

        if returnAllClaims:
            return claims['sub'], claims
        else:
            return claims['sub']
    except ValueError as e:
        print(e)
        return None
    except InvalidJWSSignature as e:
        print(e)
        return None
    except InvalidJWSObject as e:
        print(e)
        return None
    except InvalidJWSOperation as e:
        print(e)
        return None

def isAdmin():
    user, claims = authenticate(returnAllClaims=True)
    return claims['https://kwola.io/admin']

