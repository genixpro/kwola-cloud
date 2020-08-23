from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, Attachment, FileContent, FileName, FileType, Disposition, ContentId
import base64
from ..config.config import loadConfiguration



def sendStartTestingRunEmail(email, application):
    configData = loadConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=email)

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
    configData = loadConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=email)

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

