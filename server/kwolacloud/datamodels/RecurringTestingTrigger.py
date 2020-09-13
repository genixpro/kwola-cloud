#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from kwola.datamodels.CustomIDField import CustomIDField
from .RunConfiguration import RunConfiguration
from .TestingRun import TestingRun
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

    configuration = EmbeddedDocumentField(RunConfiguration)

    lastTriggerTime = DateTimeField()

    repeatTrigger = StringField(enumerate=['time', 'commit', 'webhook'], default=None)

    repeatFrequency = IntField(default=None)

    repeatUnit = StringField(enumerate=['hours', 'days', 'weeks', 'months'], default=None)

    hourOfDay = IntField(default=None)

    daysOfWeekEnabled = DictField(field=BooleanField(), default=None)

    lastTriggerTimesByDayOfWeek = DictField(field=DateTimeField(), default=dict())

    daysOfMonthEnabled = DictField(field=DictField(BooleanField()), default=None)

    lastTriggerTimesByDayOfMonth = DictField(field=DictField(DateTimeField()), default=dict())

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

        newTestingRun = TestingRun(
            id=generateKwolaId(modelClass=TestingRun, kwolaConfig=getKwolaConfiguration(), owner=self.owner),
            owner=self.owner,
            applicationId=self.applicationId,
            stripeSubscriptionId=self.stripeSubscriptionId,
            promoCode=self.promoCode,
            status="created",
            startTime=datetime.now(),
            predictedEndTime=(datetime.now() + relativedelta(hours=(self.configuration.hours + 1))),
            recurringTestingTriggerId=self.id,
            isRecurring=True,
            configuration=self.configuration
        )

        newTestingRun.save()

        self.lastTriggerTime = datetime.now()

        dayOfWeek = datetime.now().strftime('%a')
        self.lastTriggerTimesByDayOfWeek[dayOfWeek] = datetime.now()

        firstDayOfMonth = datetime.now() + relativedelta(day=1)
        weekOfMonth = str(int(datetime.now().strftime('%U')) - int(firstDayOfMonth.strftime('%U')))

        if weekOfMonth not in self.lastTriggerTimesByDayOfMonth:
            self.lastTriggerTimesByDayOfMonth[weekOfMonth] = {}
        self.lastTriggerTimesByDayOfMonth[weekOfMonth][dayOfWeek] = datetime.now()

        if self.repeatTrigger == 'commit':
            self.lastRepositoryCommitHash = self.getLatestCommitHash()

        self.save()

        newTestingRun.runJob()

    def getLatestCommitHash(self):
        gitArgs = ['git', 'clone', '--bare']

        if self.lastRepositoryCommitHash is not None:
            sinceDate = self.lastTriggerTime.isoformat()
            gitArgs += ['--shallow-since', sinceDate]

        tempCloneDir = tempfile.mkdtemp()
        gitArgs += [self.repositoryURL, tempCloneDir]

        tempHome = tempfile.mkdtemp()
        # tempHome = os.environ['HOME']
        gitEnv = copy.deepcopy(os.environ)
        gitEnv['HOME'] = tempHome

        gitURLParsed = giturlparse.parse(self.repositoryURL)

        if self.repositoryUsername:
            with open(os.path.join(tempHome, '.netrc'), 'wt') as netRCFile:
                netRCFile.writelines([
                    f'machine {gitURLParsed.host}\n',
                    f'login {self.repositoryUsername}\n',
                    f'password {self.repositoryPassword}\n'
                ])

        if self.repositorySSHPrivateKey:
            os.mkdir(os.path.join(tempHome, ".ssh"))

            keyFilePath = os.path.join(tempHome, ".ssh", "id_rsa")
            with open(keyFilePath, 'wt') as keyFile:
                keyFile.write(self.repositorySSHPrivateKey)
            os.chmod(keyFilePath, 600)

            sshConfigFilePath = os.path.join(tempHome, ".ssh", "config")
            with open(sshConfigFilePath, 'wt') as sshConfigFile:
                sshConfigFile.writelines([
                    f'Host gitserv\n',
                    f'    Hostname {gitURLParsed.host}\n',
                    f'    IdentityFile {keyFilePath}\n'
                    f'    StrictHostKeyChecking no\n'
                    f'    IdentitiesOnly yes\n'
                ])
            os.chmod(sshConfigFilePath, 600)

            knownHostsFilePath = os.path.join(tempHome, ".ssh", "known_hosts")
            result = subprocess.run(["ssh-keyscan", "-H", gitURLParsed.host], env=gitEnv, stdout=subprocess.PIPE)
            with open(knownHostsFilePath, 'wb') as knownHostsFile:
                knownHostsFile.write(result.stdout)
            os.chmod(knownHostsFilePath, 600)

            gitEnv['GIT_SSH_COMMAND'] = f"ssh -i {keyFilePath} -o UserKnownHostsFile={knownHostsFilePath}"

        result = subprocess.run(gitArgs, env=gitEnv, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        logging.info(result.stdout)
        logging.info(result.stderr)

        if result.returncode == 128:
            shutil.rmtree(tempCloneDir)
            shutil.rmtree(tempHome)
            return self.lastRepositoryCommitHash
        else:
            result = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tempCloneDir, stdout=subprocess.PIPE, env=gitEnv)
            if result.returncode == 128:
                shutil.rmtree(tempCloneDir)
                shutil.rmtree(tempHome)
                return self.lastRepositoryCommitHash
            else:
                shutil.rmtree(tempCloneDir)
                shutil.rmtree(tempHome)
                return str(result.stdout, 'utf8')



