from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import To, Mail, From, Attachment, FileContent, FileName, FileType, Disposition, ContentId
import base64
from ..config.config import loadConfiguration
import logging
import os.path
from ..tasks.utils import mountTestingRunStorageDrive, unmountTestingRunStorageDrive
from kwola.config.config import Configuration
from ..helpers.auth0 import getUserProfileFromId


def sendStartTestingRunEmail(application):
    if application.overrideNotificationEmail:
        email = application.overrideNotificationEmail
    else:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'testing run started' email to {email} for application {application.id}")

    configData = loadConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=To(email))

    message.dynamic_template_data = {}

    screenshot = application.fetchScreenshot()
    message.attachment = Attachment(FileContent(str(base64.b64encode(screenshot), 'ascii')),
                                    FileName('application.png'),
                                    FileType('image/png'),
                                    Disposition('inline'),
                                    ContentId('applicationImage'))

    message.template_id = 'd-e2504a7736cb4de4b35f3e164f1d5537'
    sg = SendGridAPIClient(configData['sendgrid']['apiKey'])
    response = sg.send(message)



def sendBugFoundNotification(application, bug):
    if application.overrideNotificationEmail:
        email = application.overrideNotificationEmail
    else:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'new bug found' email to {email} for application {application.id} and bug {bug.id}")

    configData = loadConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=To(email))

    message.dynamic_template_data = {
        "bugUrl": f"{configData['frontend']['url']}app/dashboard/bugs/{bug.id}"
    }

    if not configData['features']['localRuns']:
        configDir = mountTestingRunStorageDrive(bug.applicationId)
    else:
        configDir = os.path.join("data", bug.applicationId)

    config = Configuration(configDir)

    videoFilePath = os.path.join(config.getKwolaUserDataDirectory("bugs"), f'{str(bug.id)}_bug_{str(bug.executionSessionId)}.mp4')

    if os.path.exists(videoFilePath):
        with open(videoFilePath, 'rb') as videoFile:
            videoData = videoFile.read()
    else:
        raise RuntimeError(f"The bug video was not found while trying to send an email for bug {bug.id}")

    message.attachment = Attachment(FileContent(str(base64.b64encode(videoData), 'ascii')),
                                    FileName('application.png'),
                                    FileType('image/png'),
                                    Disposition('inline'),
                                    ContentId('bugVideo'))

    message.template_id = 'd-a7f557fbf657448b9a38f7e3e5be3f8a'
    sg = SendGridAPIClient(configData['sendgrid']['apiKey'])
    response = sg.send(message)

    if not configData['features']['localRuns']:
        unmountTestingRunStorageDrive(configDir)


def sendFinishTestingRunEmail(application, testingRun, bugCount):
    if application.overrideNotificationEmail:
        email = application.overrideNotificationEmail
    else:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'testing run finished' email to {email} for testing run {testingRun.id}")

    configData = loadConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=To(email))

    message.dynamic_template_data = {
        "bugCount": bugCount,
        "testingRunUrl": configData['frontend']['url'] + "dashboard/testing_runs/" + testingRun.id
    }

    screenshot = application.fetchScreenshot()
    message.attachment = Attachment(FileContent(str(base64.b64encode(screenshot), 'ascii')),
                                    FileName('application.png'),
                                    FileType('image/png'),
                                    Disposition('inline'),
                                    ContentId('applicationImage'))

    message.template_id = 'd-f9cd06a48be7418d82a3648708fb5429'
    sg = SendGridAPIClient(configData['sendgrid']['apiKey'])
    response = sg.send(message)

