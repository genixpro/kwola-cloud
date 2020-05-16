#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


import subprocess
import tempfile
from google.cloud import storage
import os.path
import datetime
import stripe
import logging
import json


def mountTestingRunStorageDrive(testingRunId):
    bucketName = "kwola-testing-run-data-" + testingRunId

    configDir = tempfile.mkdtemp()

    storage_client = storage.Client()

    bucket = storage_client.lookup_bucket(bucketName)
    if bucket is None:
        storage_client.create_bucket(bucketName)

    result = subprocess.run(["gcsfuse", bucketName, configDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! gcsfuse did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return None
    else:
        return configDir

def unmountTestingRunStorageDrive(configDir):
    result = subprocess.run(["umount", configDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! umount did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return False

    os.rmdir(configDir)
    return True

def verifyStripeSubscription(testingRun):
    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        logging.error(f"Error! Did not find the Stripe subscription object for this testing run.")
        return False

    if subscription.status != "active":
        logging.warning("Error! Stripe subscription is not in the active state.")
        return False

    return True

def attachUsageBilling(config, testingRun, maxSessionsToBill):
    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        logging.error("Error! Did not find the Stripe subscription object for this testing run.")
        return False

    logging.info(json.dumps(list(subscription.items())))

    stripe.SubscriptionItem.create_usage_record(
        subscription['items'].data[0].id,
        quantity=int(config['testing_sequence_length'] * min(maxSessionsToBill, config['web_session_parallel_execution_sessions'])),
        timestamp=int(datetime.datetime.now().timestamp()),
        action='increment',
    )

