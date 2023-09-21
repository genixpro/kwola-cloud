#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from ..datamodels.TestingRun import TestingRun
from ..datamodels.RecurringTestingTrigger import RecurringTestingTrigger
from ..datamodels.ApplicationModel import ApplicationModel
import os.path
import logging
import traceback
import dateutil
import tempfile
from datetime import datetime
from dateutil.relativedelta import relativedelta
from ..helpers.email import sendFirstOfferSupportEmail, sendRequestFeedbackEmail, countEmailsReceivedFromAddressOnGmail, sendSecondSupportOfferEmail, sendThirdSupportOfferEmail
from ..helpers.auth0 import loadAuth0Service, updateUserProfileMetadataValue
from ..config.config import loadCloudConfiguration
import subprocess
from mongoengine.queryset.visitor import Q

def runHourlyTasks():
    try:
        now = datetime.now()

        config = loadCloudConfiguration()

        logging.info(f"Starting the hourly task job at {now.isoformat()}")

        # Try to send these in the day time.
        if now.hour >= 11 and now.hour <= 16:
            if config['features']['enableSupportOfferEmailsOnUsers']:
                sendFirstSupportOfferEmailsOnUsers()
                sendSecondSupportOfferEmailsOnUsers()
                sendThirdSupportOfferEmailsOnUsers()
            sendFeedbackRequestEmails()

        evaluateRecurringTestingTriggers()

        logging.info(f"Finished the hourly task job at {now.isoformat()}")

    except Exception as e:
        errorMessage = f"Error in the hourly tasks job:\n\n{traceback.format_exc()}"
        print(errorMessage)
        logging.error(f"{errorMessage}")
        return {"success": False, "exception": errorMessage}
    finally:
        pass



def sendFirstSupportOfferEmailsOnUsers():
    authService = loadAuth0Service()

    query = f"user_metadata.hasCreatedFirstApplication:false"
    query += f" AND user_metadata.hasSentInitialSupportEmail:false"
    query += f" AND user_metadata.hasReceivedEmailFromUser:false"
    query += f" AND created_at:[* TO {(datetime.now() - relativedelta(hours=24)).isoformat()}]"

    users = authService.users.list(q=query)['users']

    logging.info(f"Found {len(users)} users that need the first support offer email sent to them.")

    for user in users:
        email = user['email']
        if countEmailsReceivedFromAddressOnGmail(email) > 0:
            updateUserProfileMetadataValue(user['user_id'], "hasReceivedEmailFromUser", True)
        else:
            sendFirstOfferSupportEmail(email=user['email'])
            updateUserProfileMetadataValue(user['user_id'], "hasSentInitialSupportEmail", True)


def sendSecondSupportOfferEmailsOnUsers():
    authService = loadAuth0Service()

    query = f"user_metadata.hasCreatedFirstApplication:false"
    query += f" AND user_metadata.hasSentInitialSupportEmail:true"
    query += f" AND user_metadata.hasSentSecondSupportEmail:false"
    query += f" AND user_metadata.hasReceivedEmailFromUser:false"
    query += f" AND created_at:[* TO {(datetime.now() - relativedelta(days=4)).isoformat()}]"

    users = authService.users.list(q=query)['users']

    logging.info(f"Found {len(users)} users that need the second support offer email sent to them.")

    for user in users:
        email = user['email']
        if countEmailsReceivedFromAddressOnGmail(email) > 0:
            updateUserProfileMetadataValue(user['user_id'], "hasReceivedEmailFromUser", True)
        else:
            sendSecondSupportOfferEmail(email=user['email'])
            updateUserProfileMetadataValue(user['user_id'], "hasSentSecondSupportEmail", True)



def sendThirdSupportOfferEmailsOnUsers():
    authService = loadAuth0Service()

    query = f"user_metadata.hasCreatedFirstApplication:false"
    query += f" AND user_metadata.hasSentInitialSupportEmail:true"
    query += f" AND user_metadata.hasSentSecondSupportEmail:true"
    query += f" AND user_metadata.hasSentThirdSupportEmail:false"
    query += f" AND user_metadata.hasReceivedEmailFromUser:false"
    query += f" AND created_at:[* TO {(datetime.now() - relativedelta(days=9)).isoformat()}]"

    users = authService.users.list(q=query)['users']

    logging.info(f"Found {len(users)} users that need the third support offer email sent to them.")

    for user in users:
        email = user['email']
        if countEmailsReceivedFromAddressOnGmail(email) > 0:
            updateUserProfileMetadataValue(user['user_id'], "hasReceivedEmailFromUser", True)
        else:
            sendThirdSupportOfferEmail(email=user['email'])
            updateUserProfileMetadataValue(user['user_id'], "hasSentThirdSupportEmail", True)



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



def evaluateRecurringTestingTriggers():
    triggers = RecurringTestingTrigger.objects()

    logging.info(f"Processing {len(triggers)} recurring testing triggers.")

    triggersToDelete = []

    for trigger in triggers:
        if ApplicationModel.objects(Q(status__exists=False) | Q(status="active"), id=trigger.applicationId).count() == 0:
            logging.warning(f"Warning: The application object with id {trigger.applicationId} attached to trigger {trigger.id} is either missing from the database, or is no longer marked as active. Deleting the trigger object.")
            triggersToDelete.append(trigger)
            continue

        application = ApplicationModel.objects(id=trigger.applicationId).first()
        if not application.checkSubscriptionLaunchRunAllowed():
            continue
        
        if trigger.repeatTrigger == 'time':
            dayOfWeek = datetime.now().strftime('%w')

            nextExecutionTime = None
            if trigger.repeatUnit == 'hours':
                if trigger.lastTriggerTime is None:
                    nextExecutionTime = datetime.now() + relativedelta(minutes=-1)
                else:
                    nextExecutionTime = (trigger.lastTriggerTime + relativedelta(hours=trigger.repeatFrequency, minutes=-1))
            elif trigger.repeatUnit == 'days':
                if trigger.lastTriggerTime is None:
                    nextExecutionTime = datetime.now() + relativedelta(minutes=-1, hour=trigger.hourOfDay)
                else:
                    nextExecutionTime = (trigger.lastTriggerTime + relativedelta(days=trigger.repeatFrequency, hour=trigger.hourOfDay, minutes=-1))
            elif trigger.repeatUnit == 'weeks':
                if trigger.daysOfWeekEnabled[dayOfWeek]:
                    if trigger.lastTriggerTime is None or dayOfWeek not in trigger.lastTriggerTimesByDayOfWeek:
                        nextExecutionTime = (datetime.now() + relativedelta(minutes=-1, hour=trigger.hourOfDay))
                    else:
                        nextExecutionTime = (trigger.lastTriggerTimesByDayOfWeek[dayOfWeek] + relativedelta(weeks=trigger.repeatFrequency, minutes=-1, hour=trigger.hourOfDay))
                else:
                    nextExecutionTime = None
            elif trigger.repeatUnit == 'months':
                firstDayOfMonth = datetime.now() + relativedelta(day=1)
                weekOfMonth = str(int(datetime.now().strftime('%U')) - int(firstDayOfMonth.strftime('%U')))

                if trigger.daysOfMonthEnabled[weekOfMonth][dayOfWeek]:
                    if trigger.lastTriggerTime is None \
                            or weekOfMonth not in trigger.lastTriggerTimesByDayOfMonth\
                            or dayOfWeek not in trigger.lastTriggerTimesByDayOfMonth[weekOfMonth]:
                        nextExecutionTime = (datetime.now() + relativedelta(minutes=-1, hour=trigger.hourOfDay))
                    else:
                        nextExecutionTime = (trigger.lastTriggerTimesByDayOfMonth[weekOfMonth][dayOfWeek] + relativedelta(months=trigger.repeatFrequency, minutes=-1, hour=trigger.hourOfDay))
                else:
                    nextExecutionTime = None
            elif trigger.repeatUnit == 'months_by_date':
                dateOfMonth = str(int(datetime.now().strftime('%d')) - 1)

                if dateOfMonth in trigger.datesOfMonthEnabled and trigger.datesOfMonthEnabled[dateOfMonth]:
                    if trigger.lastTriggerTime is None or dateOfMonth not in trigger.lastTriggerTimesByDateOfMonth:
                        nextExecutionTime = (datetime.now() + relativedelta(minutes=-1, hour=trigger.hourOfDay))
                    else:
                        nextExecutionTime = (trigger.lastTriggerTimesByDateOfMonth[dateOfMonth] + relativedelta(months=trigger.repeatFrequency, minutes=-1, hour=trigger.hourOfDay))
                else:
                    nextExecutionTime = None

            if nextExecutionTime is not None:
                if datetime.now() > nextExecutionTime:
                    trigger.launchTestingRun()
        elif trigger.repeatTrigger == "commit":
            if trigger.lastRepositoryCommitHash is None:
                trigger.launchTestingRun()
            else:
                newCommitHash = trigger.getLatestCommitHash()
                if newCommitHash != trigger.lastRepositoryCommitHash:
                    trigger.launchTestingRun()

    for trigger in triggersToDelete:
        trigger.delete()




