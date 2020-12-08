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
import shutil
import time
import google.api_core.exceptions
from kwola.components.utils.retry import autoretry
from kwola.config.config import getSharedGCSStorageClient


def bucketNamesForApplication(applicationId):
    bucketName = "kwola-testing-run-data-" + applicationId
    cacheBucketName = bucketName + "-cache"
    return bucketName, cacheBucketName


@autoretry()
def createMainStorageBucketIfNeeded(applicationId):
    bucketName, cacheBucketName = bucketNamesForApplication(applicationId)

    storage_client = getSharedGCSStorageClient()

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

@autoretry()
def createCacheBucketIfNeeded(applicationId):
    bucketName, cacheBucketName = bucketNamesForApplication(applicationId)

    storage_client = getSharedGCSStorageClient()

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

def verifyStripeSubscription(testingRun):
    if testingRun.stripeSubscriptionId is None:
        return True

    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        logging.error(f"Error! Did not find the Stripe subscription object for this testing run.")
        return False

    if subscription.status != "active" and subscription.status != "trialing" and subscription.status != "past_due":
        logging.warning("Error! Stripe subscription is not in the active state.")
        return False

    return True
