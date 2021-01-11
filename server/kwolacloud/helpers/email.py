from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import To, Mail, From, Attachment, FileContent, FileName, FileType, Disposition, ContentId
import base64
from ..config.config import loadCloudConfiguration
import logging
import os.path
from kwola.config.config import KwolaCoreConfiguration
from ..helpers.auth0 import getUserProfileFromId
import pickle
import base64
from kwolacloud.config.config import loadCloudConfiguration
from kwolacloud.datamodels.GmailMarketingToken import GmailMarketingToken
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from email.mime.text import MIMEText
import httplib2


def sendStartTestingRunEmail(application):
    if application.overrideNotificationEmail:
        email = application.overrideNotificationEmail
    else:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'testing run started' email to {email} for application {application.id}")

    configData = loadCloudConfiguration()

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

    configData = loadCloudConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=To(email))

    message.dynamic_template_data = {
        "bugUrl": f"{configData['frontend']['url']}app/dashboard/bugs/{bug.id}"
    }

    config = application.defaultRunConfiguration.createKwolaCoreConfiguration(application.owner, application.id, None)

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



def sendFinishTestingRunEmail(application, testingRun, bugCount):
    if application.overrideNotificationEmail:
        email = application.overrideNotificationEmail
    else:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'testing run finished' email to {email} for testing run {testingRun.id}")

    configData = loadCloudConfiguration()

    message = Mail(
        from_email=From('admin@kwola.io', 'Kwola'),
        to_emails=To(email))

    message.dynamic_template_data = {
        "bugCount": bugCount,
        "testingRunUrl": configData['frontend']['url'] + "app/dashboard/testing_runs/" + testingRun.id
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


def getGmailCredentials():
    object = GmailMarketingToken.objects(id="main").first()
    if object is None:
        raise RuntimeError("Did not find the gmail marketing token.")

    credentials = pickle.loads(base64.urlsafe_b64decode(bytes(object.token, 'ascii')))

    if credentials.access_token_expired and credentials.refresh_token:
        http = httplib2.Http()
        credentials.refresh(http)
        object.token = str(base64.urlsafe_b64encode(pickle.dumps(credentials)), 'ascii')
        object.save()

    return credentials


def sendGmailDirectEmail(to, subject, message_text):
    credentials = getGmailCredentials()

    message = MIMEText(message_text)
    message['to'] = to
    message['from'] = "Brad@kwola.io"
    message['subject'] = subject
    messageBody = {'raw': str(base64.urlsafe_b64encode(bytes(message.as_string(), "utf8")), "ascii")}

    http = httplib2.Http()
    http = credentials.authorize(http)

    service = build('gmail', 'v1', http=http, cache_discovery=False)
    service.users().messages().send(userId="me", body=messageBody).execute()


def countEmailsReceivedFromAddressOnGmail(email):
    credentials = getGmailCredentials()

    http = httplib2.Http()
    http = credentials.authorize(http)

    service = build('gmail', 'v1', http=http, cache_discovery=False)
    messages = service.users().messages().list(userId="me", q=f"from:{email}").execute()
    count = messages['resultSizeEstimate']
    return count


def sendFirstOfferSupportEmail(application=None, email=None):
    if email is None:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'first offer support' email to {email}")

    configData = loadCloudConfiguration()

    sendGmailDirectEmail(email, "Want help with Kwola?", supportOfferEmailMessageText)


def sendSecondSupportOfferEmail(application=None, email=None):
    if email is None:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'second offer support' email to {email}")

    configData = loadCloudConfiguration()

    sendGmailDirectEmail(email, "Following Up", supportOfferFollowUpEmailMessageText)



def sendThirdSupportOfferEmail(application=None, email=None):
    if email is None:
        email = getUserProfileFromId(application.owner)['email']

    logging.info(f"Sending the 'third offer support / promocode offer' email to {email}")

    configData = loadCloudConfiguration()

    sendGmailDirectEmail(email, "Promocode - Try Kwola for free!", promocodeOfferEmailMessageText)



def sendRequestFeedbackEmail(owner):
    email = getUserProfileFromId(owner)['email']

    logging.info(f"Sending the 'request feedback' email to {email}")

    configData = loadCloudConfiguration()

    sendGmailDirectEmail(email, "Feedback on testing run?", requestFeedbackEmailMessageText)



signatureMessageText = """Brad, founder and CTO @ Kwola
brad@kwola.io
647-261-0462
162 Joseph Aaron Boulevard
Vaughan, Ontario, L4J 6C3
"""

supportOfferEmailMessageText = """Hello! My name is Brad and I'm the founder here at Kwola. I saw that you recently logged in to check it out, and I thought I would reach out and offer you support setting up Kwola and help ensuring that Kwola works for you and is able to finds lots of bugs. 

Do you have time in the next week or so to set up a call and chat? You can use my calendar link here: https://calendly.com/kwola-brad to book something or just reply and give me a couple of times that work for you and I will try to squeeze it in.

Thanks!

""" + signatureMessageText



supportOfferFollowUpEmailMessageText = """Hello! Just following up from my last email - wondering if you would have time to have a call and chat about what your looking for in a testing tool.

Just looking to understand what lead you to Kwola and maybe get some ideas on what we can improve to better serve what your looking for.

Let me know!

""" + signatureMessageText



promocodeOfferEmailMessageText = """Hey! Just wanted to give you one last shout out here.

If you really wanted to try Kwola, I can hook you up with a promo code that will allow you to do a one off testing run without being charged. That code is: BETATRIAL. You also get the first month free when you sign up to the monthly package, so feel free to sign up, give it a shot and unsubscribe if you aren't happy with the results. No money will be charged.

Additionally I just want to note that I'm always here to help, feel free to reach out to me anytime at brad@kwola.io or on my personal number, 647-261-0462 and I can walk you through the configuration or just answer any questions you might have.

I'm always here to help. Thanks!

""" + signatureMessageText



requestFeedbackEmailMessageText = """Hello,

I saw that you did a testing run on Kwola - awesome! Thank you for checking out our product.

I'm Brad and I'm reaching out to ask what you thought of the product? Did Kwola find any useful bugs for you? What could we do better?

Would you have time to have a quick call to review the results?

""" + signatureMessageText

