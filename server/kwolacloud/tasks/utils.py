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
import google.api_core.exceptions



def mountTestingRunStorageDrive(applicationId):
    bucketName = "kwola-testing-run-data-" + applicationId
    cacheBucketName = bucketName + "-cache"

    fuseCommandParameters = ["gcsfuse", "--stat-cache-ttl", "1.5h", "--stat-cache-capacity", "16777216", "--type-cache-ttl", "1.5h", "--limit-ops-per-sec", "-1"]

    configDir = tempfile.mkdtemp()

    storage_client = storage.Client()

    bucket = storage_client.lookup_bucket(bucketName)
    if bucket is None:
        try:
            bucket = storage_client.create_bucket(bucketName)
        except google.api_core.exceptions.Conflict:
            # Ignore this. Its a very rare error that occurs when two testing runs start
            # almost perfect simultaneously, and they are both the first testing runs for
            # this application. We can ignore this because it means the bucket was already
            # created.
            pass

    result = subprocess.run(fuseCommandParameters + [bucketName, configDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! gcsfuse did not return success for initial mount. Code: {result.returncode}\n{result.stdout}\n{result.stderr}")
        return None

    cacheBucket = storage_client.lookup_bucket(cacheBucketName)
    if cacheBucket is None:
        try:
            cacheBucket = storage_client.create_bucket(cacheBucketName)
            cacheBucket.clear_lifecyle_rules()
            cacheBucket.add_lifecycle_delete_rule(age=30)
            cacheBucket.patch()

        except google.api_core.exceptions.Conflict:
            # Ignore this. Its a very rare error that occurs when two testing runs start
            # almost perfect simultaneously, and they are both the first testing runs for
            # this application. We can ignore this because it means the bucket was already
            # created.
            pass

    preparedSamplesCacheDir = os.path.join(configDir, "prepared_samples")
    result = subprocess.run(fuseCommandParameters + [cacheBucketName, preparedSamplesCacheDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! gcsfuse did not return success for prepared samples mount. Code: {result.returncode}\n{result.stdout}\n{result.stderr}")
        return None

    executionTraceWeightFilesDir = os.path.join(configDir, "execution_trace_weight_files")
    result = subprocess.run(fuseCommandParameters + [cacheBucketName, executionTraceWeightFilesDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! gcsfuse did not return success for weight files mount. Code: {result.returncode}\n{result.stdout}\n{result.stderr}")
        return None

    return configDir


def unmountTestingRunStorageDrive(configDir):
    preparedSamplesCacheDir = os.path.join(configDir, "prepared_samples")
    result = subprocess.run(["fusermount", "-u", preparedSamplesCacheDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! umount did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return False

    executionTraceWeightFilesDir = os.path.join(configDir, "execution_trace_weight_files")
    result = subprocess.run(["fusermount", "-u", executionTraceWeightFilesDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! umount did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return False

    result = subprocess.run(["fusermount", "-u", configDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! umount did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return False

    os.rmdir(configDir)
    return True

def verifyStripeSubscription(testingRun):
    if testingRun.stripeSubscriptionId is None:
        return True

    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        logging.error(f"Error! Did not find the Stripe subscription object for this testing run.")
        return False

    if subscription.status != "active":
        logging.warning("Error! Stripe subscription is not in the active state.")
        return False

    return True

def attachUsageBilling(config, testingRun, sessionsToBill):
    if testingRun.stripeSubscriptionId is None:
        return True

    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        logging.error("Error! Did not find the Stripe subscription object for this testing run.")
        return False

    stripe.SubscriptionItem.create_usage_record(
        subscription['items'].data[0].id,
        quantity=int(config['testing_sequence_length'] * sessionsToBill),
        timestamp=int(datetime.datetime.now().timestamp()),
        action='increment',
    )

    return True

