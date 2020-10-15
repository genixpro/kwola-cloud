#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from kwola.datamodels.CustomIDField import CustomIDField
from .RunConfiguration import RunConfiguration
from .TestingRun import TestingRun
from .ApplicationModel import ApplicationModel
from mongoengine import *
from kwola.tasks.ManagedTaskSubprocess import ManagedTaskSubprocess
from ..config.config import getKwolaConfiguration
from ..config.config import loadConfiguration
from .id_utility import generateKwolaId
from datetime import datetime
from dateutil.relativedelta import relativedelta
import subprocess
import tempfile
import os
import copy
import sys
import shutil
import urllib.parse
import logging
import stripe
import stat
import giturlparse


class RecurringTestingTrigger(Document):
    meta = {
        'indexes': [
            ('owner',),
            ('owner', 'applicationId'),
            ('webhookIdentifier',)
        ]
    }

    id = CustomIDField()

    owner = StringField()

    creationTime = DateTimeField()

    applicationId = StringField()

    stripeSubscriptionId = StringField()

    promoCode = StringField()

    # This is now deprecated. Now instead the defaultRunConfiguration
    # attached to the application object is used as the basis for
    # the testing runs for recurring testing triggers.
    configuration = EmbeddedDocumentField(RunConfiguration)

    lastTriggerTime = DateTimeField()

    repeatTrigger = StringField(enumerate=['time', 'commit', 'webhook'], default=None)

    repeatFrequency = IntField(default=None)

    repeatUnit = StringField(enumerate=['hours', 'days', 'weeks', 'months', 'months_by_date'], default=None)

    hourOfDay = IntField(default=None)

    daysOfWeekEnabled = DictField(field=BooleanField(), default=None)

    lastTriggerTimesByDayOfWeek = DictField(field=DateTimeField(), default=dict())

    daysOfMonthEnabled = DictField(field=DictField(BooleanField()), default=None)

    lastTriggerTimesByDayOfMonth = DictField(field=DictField(DateTimeField()), default=dict())

    datesOfMonthEnabled = DictField(field=BooleanField(), default=None)

    lastTriggerTimesByDateOfMonth = DictField(field=DateTimeField(), default=dict())

    repositoryURL = StringField(default=None)

    repositoryUsername = StringField(default=None)

    repositoryPassword = StringField(default=None)

    repositorySSHPrivateKey = StringField(default=None)

    lastRepositoryCommitHash = StringField(default=None)

    webhookIdentifier = StringField(default=None)

    def saveToDisk(self, config):
        self.save()

    @staticmethod
    def loadFromDisk(id, config, printErrorOnFailure=True):
        return RecurringTestingTrigger.objects(id=id).first()



    def launchTestingRun(self):
        logging.info(f"Launching a testing run for application {self.applicationId}")

        application = ApplicationModel.objects(id=self.applicationId).first()

        configData = loadConfiguration()

        newTestingRun = TestingRun(
            id=generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=self.owner),
            owner=self.owner,
            applicationId=self.applicationId,
            stripeSubscriptionId=self.stripeSubscriptionId,
            promoCode=self.promoCode,
            status="created",
            startTime=datetime.now(),
            predictedEndTime=(datetime.now() + relativedelta(hours=(application.defaultRunConfiguration.hours + 1), minute=30, second=0, microsecond=0)),
            recurringTestingTriggerId=self.id,
            isRecurring=True,
            configuration=application.defaultRunConfiguration,
            launchSource="trigger"
        )

        newTestingRun.save()

        self.lastTriggerTime = datetime.now()

        dayOfWeek = datetime.now().strftime('%w')
        self.lastTriggerTimesByDayOfWeek[dayOfWeek] = datetime.now()

        firstDayOfMonth = datetime.now() + relativedelta(day=1)
        weekOfMonth = str(int(datetime.now().strftime('%U')) - int(firstDayOfMonth.strftime('%U')))
        dateOfMonth = str(int(datetime.now().strftime('%d')) - 1)

        if weekOfMonth not in self.lastTriggerTimesByDayOfMonth:
            self.lastTriggerTimesByDayOfMonth[weekOfMonth] = {}
        self.lastTriggerTimesByDayOfMonth[weekOfMonth][dayOfWeek] = datetime.now()

        self.lastTriggerTimesByDateOfMonth[dateOfMonth] = datetime.now()

        if self.repeatTrigger == 'commit':
            self.lastRepositoryCommitHash = self.getLatestCommitHash()

        self.save()

        newTestingRun.runJob()

        if application.package == "monthly" and application.countTestingRunsLaunchedThisMonth() > 5 and application.stripeSubscriptionId is not None:
            subscription = stripe.Subscription.retrieve(application.stripeSubscriptionId)

            stripe.InvoiceItem.create(
                customer=subscription.customer,
                price=configData['stripe']['monthlyExtraPriceId'],
                subscription=application.stripeSubscriptionId
            )

    def getLatestCommitHash(self):
        gitArgs = ['git', 'clone', '--bare']

        if self.lastRepositoryCommitHash is not None:
            sinceDate = self.lastTriggerTime.isoformat()
            gitArgs += ['--shallow-since', sinceDate]

        tempCloneDir = tempfile.mkdtemp()
        gitArgs += [self.repositoryURL, tempCloneDir]

        homeDir = os.environ['HOME']
        gitEnv = copy.deepcopy(os.environ)

        gitURLParsed = giturlparse.parse(self.repositoryURL)

        if self.repositoryUsername:
            with open(os.path.join(homeDir, '.netrc'), 'wt') as netRCFile:
                netRCFile.writelines([
                    f'machine {gitURLParsed.host}\n',
                    f'login {self.repositoryUsername}\n',
                    f'password {self.repositoryPassword}\n'
                ])

        if self.repositorySSHPrivateKey:
            if not os.path.exists(os.path.join(homeDir, ".ssh")):
                os.mkdir(os.path.join(homeDir, ".ssh"))

            keyFilePath = os.path.join(homeDir, ".ssh", "id_rsa")
            with open(keyFilePath, 'wt') as keyFile:
                keyFile.write(self.repositorySSHPrivateKey)
            os.chmod(keyFilePath, stat.S_IRUSR | stat.S_IWUSR)


        result = subprocess.run(gitArgs, env=gitEnv, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if result.returncode == 128:
            shutil.rmtree(tempCloneDir)
            return self.lastRepositoryCommitHash
        else:
            result = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tempCloneDir, stdout=subprocess.PIPE, env=gitEnv)
            if result.returncode == 128:
                shutil.rmtree(tempCloneDir)
                return self.lastRepositoryCommitHash
            else:
                shutil.rmtree(tempCloneDir)
                return str(result.stdout, 'utf8')



