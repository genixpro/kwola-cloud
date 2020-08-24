from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import To, Mail, From, Attachment, FileContent, FileName, FileType, Disposition, ContentId
import base64
from ..config.config import loadConfiguration
import logging



def sendStartTestingRunEmail(email, application):
    logging.info(f"Sending the testing run started email to {email} for application {application.id}")

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




def sendFinishTestingRunEmail(email, application, testingRun, bugCount):
    logging.info(f"Sending the testing run finished email to {email} for testing run {testingRun.id}")

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

