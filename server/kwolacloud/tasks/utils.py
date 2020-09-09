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
import google.api_core.exceptions


def bucketNamesForApplication(applicationId):
    bucketName = "kwola-testing-run-data-" + applicationId
    cacheBucketName = bucketName + "-cache"
    return bucketName, cacheBucketName



def createMainStorageBucketIfNeeded(applicationId):
    bucketName, cacheBucketName = bucketNamesForApplication(applicationId)

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


def createCacheBucketIfNeeded(applicationId):
    bucketName, cacheBucketName = bucketNamesForApplication(applicationId)

    storage_client = storage.Client()

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

def runMountStorageBucketCommand(bucketName, localDirectory):
    fuseCommandParameters = ["gcsfuse", "--stat-cache-ttl", "1.5h", "--stat-cache-capacity", "16777216",
                             "--type-cache-ttl", "1.5h", "--limit-ops-per-sec", "-1"]

    result = subprocess.run(fuseCommandParameters + [bucketName, localDirectory], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! gcsfuse did not return success for mounting bucket {bucketName}. Code: {result.returncode}\n{result.stdout}\n{result.stderr}")
        return False
    return True

def runMakeSymbolicLinkCommand(targetDir, linkPath):
    result = subprocess.run(['ln', '-s', targetDir, linkPath], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! ln did not return success for linking {targetDir} to {linkPath}. Code: {result.returncode}\n{result.stdout}\n{result.stderr}")
        return False
    return True

def getLinkTargetDirectory(linkPath):
    result = subprocess.run(["readlink", "-f", linkPath], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! readlink did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return None
    return str(result.stdout, 'utf8')

def runUnmountCommand(targetDirectory):
    result = subprocess.run(["fusermount", "-u", targetDirectory], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error(f"Error! fusermount did not return success f{result.returncode}\n{result.stdout}\n{result.stderr}")
        return False
    return True


def mountTestingRunStorageDrive(applicationId):
    bucketName, cacheBucketName = bucketNamesForApplication(applicationId)

    configDir = tempfile.mkdtemp()
    mainBucketDir = tempfile.mkdtemp()
    cacheDir = tempfile.mkdtemp()

    createMainStorageBucketIfNeeded(applicationId)
    createCacheBucketIfNeeded(applicationId)

    success = runMountStorageBucketCommand(bucketName, mainBucketDir)
    if not success:
        return None

    success = runMountStorageBucketCommand(cacheBucketName, cacheDir)
    if not success:
        return None

    mainStorageFolders = [
        "annotated_videos",
        "bug_zip_files",
        "bugs",
        "chrome_cache",
        "execution_traces",
        "kwola.json",
        "javascript",
        "models",
        "proxy_cache",
        "testing_steps",
        "videos"
    ]

    cacheFolders = [
        "prepared_samples",
        "execution_trace_weight_files"
    ]

    for folder in mainStorageFolders:
        success = runMakeSymbolicLinkCommand(os.path.join(mainBucketDir, folder), os.path.join(configDir, folder))
        if not success:
            return None

    for folder in cacheFolders:
        success = runMakeSymbolicLinkCommand(os.path.join(cacheDir, folder), os.path.join(configDir, folder))
        if not success:
            return None

    return configDir


def unmountTestingRunStorageDrive(configDir):
    preparedSamplesCacheDir = os.path.join(configDir, "prepared_samples")
    bugsDir = os.path.join(configDir, "bugs")

    actualCacheDir = getLinkTargetDirectory(preparedSamplesCacheDir)
    if actualCacheDir is None:
        return False

    actualMainStorageDir = getLinkTargetDirectory(bugsDir)
    if actualCacheDir is None:
        return False

    success = runUnmountCommand(actualCacheDir)
    if not success:
        return False

    success = runUnmountCommand(actualMainStorageDir)
    if not success:
        return False

    shutil.rmtree(configDir)
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

