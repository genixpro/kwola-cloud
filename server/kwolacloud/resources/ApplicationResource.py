#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from flask_restful import Resource, reqparse, abort
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                jwt_required, jwt_refresh_token_required, get_jwt_identity, get_raw_jwt)
from ..app import cache

from ..datamodels.ApplicationModel import ApplicationModel
import json
from selenium import webdriver
from selenium.webdriver.common.proxy import Proxy, ProxyType
from selenium.webdriver.chrome.options import Options
import flask
from ..datamodels.id_utility import generateKwolaId
from ..config.config import getKwolaConfiguration
from ..auth import authenticate, isAdmin
import selenium
import selenium.common.exceptions

class ApplicationGroup(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('name', help='This field cannot be blank', required=True)
        self.postParser.add_argument('url', help='This field cannot be blank', required=True)

    def get(self):
        user = authenticate()
        if user is None:
            abort(401)

        applications = ApplicationModel.objects(owner=user).no_dereference().to_json()

        return {"applications": json.loads(applications)}

    def post(self):
        user = authenticate()
        if user is None:
            abort(401)

        data = self.postParser.parse_args()


        newApplication = ApplicationModel(
            name=data['name'],
            url=data['url'],
            owner=user,
            id=generateKwolaId(modelClass=ApplicationModel, kwolaConfig=getKwolaConfiguration(), owner=user)
        )

        newApplication.save()

        return {"applicationId": str(newApplication.id)}

        # if not current_user:
        #     return {'message': 'User {} doesn\'t exist'.format(data['username'])}
        #
        # if data['username'] == current_user['username'] and data['password'] == current_user['password']:
        #     access_token = create_access_token(identity=data['username'])
        #     return {
        #         'token': access_token,
        #     }
        # else:
        #     return {'message': 'Wrong credentials'}


class ApplicationSingle(Resource):
    def __init__(self):
        self.postParser = reqparse.RequestParser()
        self.postParser.add_argument('name', help='This field cannot be blank', required=True)
        self.postParser.add_argument('url', help='This field cannot be blank', required=True)

    def get(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        if application is not None:
            return json.loads(application.to_json())
        else:
            abort(404)


class ApplicationImage(Resource):
    @cache.cached(timeout=36000)
    def get(self, application_id):
        user = authenticate()
        if user is None:
            abort(401)

        query = {"id": application_id}
        if not isAdmin():
            query['owner'] = user

        application = ApplicationModel.objects(**query).limit(1).first()

        chrome_options = Options()
        chrome_options.headless = True

        driver = webdriver.Chrome(chrome_options=chrome_options)
        driver.set_page_load_timeout(20)
        try:
            driver.get(application.url)
        except selenium.common.exceptions.TimeoutException:
            pass
        screenshotData = driver.get_screenshot_as_png()
        driver.quit()

        response = flask.make_response(screenshotData)
        response.headers['content-type'] = 'image/png'
        return response

