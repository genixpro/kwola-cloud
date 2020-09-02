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
from ..helpers.auth0 import authService, updateUserProfileMetadataValue


def runHourlyTasks():
    try:
        logging.info(f"Starting the hourly task job.")

        sendSupportOfferEmailsOnApplications()
        sendSupportOfferEmailsOnUsers()
        sendFeedbackRequestEmails()

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

    for app in applications:
        sendOfferSupportEmail(application=app)
        app.hasSentSupportOfferEmail = True
        app.save()



def sendSupportOfferEmailsOnUsers():
    users = authService.users.list(q=f"user_metadata.hasCreatedFirstApplication:false AND user_metadata.hasSentInitialSupportEmail:false AND created_at:[* TO {(datetime.datetime.now() - relativedelta(hours=24)).isoformat()}]")['users']
    for user in users:
        sendOfferSupportEmail(email=user['email'])
        updateUserProfileMetadataValue(user['user_id'], "hasSentInitialSupportEmail", True)



def sendFeedbackRequestEmails():
    testingRunsNeedingFeedbackRequest = TestingRun.objects(
        status="completed",
        needsFeedbackRequestEmail=True,
        endTime__lt=(datetime.now() - relativedelta(hours=24))
    )

    for run in testingRunsNeedingFeedbackRequest:
        sendRequestFeedbackEmail(run.owner)

        run.needsFeedbackRequestEmail = False
        run.save()



