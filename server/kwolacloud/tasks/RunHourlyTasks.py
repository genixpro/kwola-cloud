#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..datamodels.TestingRun import TestingRun
from ..datamodels.ApplicationModel import ApplicationModel
import os.path
import logging
import traceback
from datetime import datetime
from dateutil.relativedelta import relativedelta
from ..helpers.email import sendOfferSupportEmail, sendRequestFeedbackEmail
from ..helpers.auth0 import loadAuth0Service, updateUserProfileMetadataValue
from ..config.config import loadConfiguration

def runHourlyTasks():
    try:
        now = datetime.now()

        config = loadConfiguration()

        logging.info(f"Starting the hourly task job at {now.isoformat()}")

        # Try to send these in the day time.
        if now.hour >= 11 and now.hour <= 16:
            sendSupportOfferEmailsOnApplications()
            if config['features']['enableSupportOfferEmailsOnUsers']:
                sendSupportOfferEmailsOnUsers()
            sendFeedbackRequestEmails()

        logging.info(f"Finished the hourly task job at {now.isoformat()}")

    except Exception as e:
        errorMessage = f"Error in the hourly tasks job:\n\n{traceback.format_exc()}"
        logging.error(f"[{os.getpid()}] {errorMessage}")
        return {"success": False, "exception": errorMessage}
    finally:
        pass


def sendSupportOfferEmailsOnApplications():
    applications = ApplicationModel.objects(
        hasFirstTestingRunLaunched=False,
        creationDate__lt=(datetime.now() - relativedelta(hours=24)),
        hasSentSupportOfferEmail=False
    )

    logging.info(f"Found {len(applications)} application objects that need a support offer sent to them.")

    for app in applications:
        sendOfferSupportEmail(application=app)
        app.hasSentSupportOfferEmail = True
        app.save()




def sendSupportOfferEmailsOnUsers():
    authService = loadAuth0Service()

    users = authService.users.list(q=f"user_metadata.hasCreatedFirstApplication:false AND user_metadata.hasSentInitialSupportEmail:false AND created_at:[* TO {(datetime.now() - relativedelta(hours=24)).isoformat()}]")['users']

    logging.info(f"Found {len(users)} users that need a support offer sent to them.")

    for user in users:
        sendOfferSupportEmail(email=user['email'])
        updateUserProfileMetadataValue(user['user_id'], "hasSentInitialSupportEmail", True)



def sendFeedbackRequestEmails():
    testingRunsNeedingFeedbackRequest = TestingRun.objects(
        status="completed",
        needsFeedbackRequestEmail=True,
        endTime__lt=(datetime.now() - relativedelta(hours=24))
    )

    logging.info(f"Found {len(testingRunsNeedingFeedbackRequest)} testing runs that need a feedback request sent for them.")

    for run in testingRunsNeedingFeedbackRequest:
        sendRequestFeedbackEmail(run.owner)

        run.needsFeedbackRequestEmail = False
        run.save()



