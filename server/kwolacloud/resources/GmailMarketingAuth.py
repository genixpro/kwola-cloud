#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from flask_restful import Resource, reqparse
from flask import redirect, abort
import subprocess
import json
import flask
import os
import logging
from oauth2client.client import flow_from_clientsecrets
from oauth2client.client import FlowExchangeError
from apiclient.discovery import build
import pkg_resources
import pickle
import base64
from kwolacloud.config.config import loadCloudConfiguration
from kwolacloud.datamodels.GmailMarketingToken import GmailMarketingToken
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from email.mime.text import MIMEText
import httplib2
from ..helpers.email import sendGmailDirectEmail, supportOfferEmailMessageText, countEmailsReceivedFromAddressOnGmail



class GmailMarketingAuthStart(Resource):
    def __init__(self):
        self.cloudConfig = loadCloudConfiguration()
        self.clientSecretsFile = pkg_resources.resource_filename("kwolacloud", "config/keys/marketing.json")
        self.redirectUri = self.cloudConfig['auth0']['apiUrl'] + "marketing_auth"
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
        ]


    def get(self):
        flow = flow_from_clientsecrets(self.clientSecretsFile, ' '.join(self.scopes))
        flow.params['access_type'] = 'offline'
        flow.params['approval_prompt'] = 'force'
        flow.params['user_id'] = "brad@kwola.io"
        flow.params['state'] = ""
        url = flow.step1_get_authorize_url(self.redirectUri)
        return redirect(url)


class GmailMarketingAuthCallback(Resource):
    def __init__(self):
        self.cloudConfig = loadCloudConfiguration()
        self.clientSecretsFile = pkg_resources.resource_filename("kwolacloud", "config/keys/marketing.json")
        self.redirectUri = self.cloudConfig['auth0']['apiUrl'] + "marketing_auth"
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
        ]


    def get(self):
        authorization_code = flask.request.args.get('code')

        flow = flow_from_clientsecrets(self.clientSecretsFile, ' '.join(self.scopes))
        flow.redirect_uri = self.redirectUri
        try:
            credentials = flow.step2_exchange(authorization_code)

            object = GmailMarketingToken.objects(id="main").first()
            if object is None:
                object = GmailMarketingToken(id="main")

            object.token = str(base64.urlsafe_b64encode(pickle.dumps(credentials)), 'ascii')
            object.save()

        except FlowExchangeError as error:
            logging.error('An error occurred: %s', error)
            return abort(400)
            # raise CodeExchangeException(None)




class GmailMarketingTestEmail(Resource):
    def __init__(self):
        self.cloudConfig = loadCloudConfiguration()
        self.clientSecretsFile = pkg_resources.resource_filename("kwolacloud", "config/keys/marketing.json")
        self.redirectUri = self.cloudConfig['auth0']['apiUrl'] + "marketing_auth"
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
        ]


    def get(self):
        email = "genixpro@gmail.com"
        message_text = supportOfferEmailMessageText
        subject = "Testing Email"

        sendGmailDirectEmail(email, subject, message_text)



