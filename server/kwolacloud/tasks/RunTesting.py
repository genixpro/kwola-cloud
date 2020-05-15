#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..app import celeryApplication
from ..datamodels.TestingRun import TestingRun
from kwola.datamodels.TrainingStepModel import TrainingStep
from kwola.components.environments.WebEnvironment import WebEnvironment
import subprocess
import tempfile
from google.cloud import storage
import os.path
import json
from ..config.config import getKwolaConfigurationData
import time
import datetime
from kwola.tasks.RunTestingStep import runTestingStep
from kwola.config.config import Configuration
from kwola.datamodels.TestingStepModel import TestingStep
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.tasks import RunTestingStep
from kwola.tasks import RunTrainingStep
import stripe

def mountTestingRunStorageDrive(testingRunId):
    bucketName = "kwola-testing-run-data-" + testingRunId

    configDir = tempfile.mkdtemp()

    storage_client = storage.Client()

    bucket = storage_client.lookup_bucket(bucketName)
    if bucket is None:
        storage_client.create_bucket(bucketName)

    result = subprocess.run(["gcsfuse", bucketName, configDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        print("Error! gcsfuse did not return success", result.returncode)
        print(result.stdout)
        print(result.stderr)
        return None
    else:
        return configDir

def unmountTestingRunStorageDrive(configDir):
    result = subprocess.run(["umount", configDir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        print("Error! umount did not return success")
        print(result.stdout)
        print(result.stderr)
        return False

    os.rmdir(configDir)
    return True

def verifyStripeSubscription(testingRun):
    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        print("Error! Did not find the Stripe subscription object for this testing run.")
        return False

    if subscription.status != "active":
        print("Error! Stripe subscription is not in the active state.")
        return False

    return True

def attachUsageBilling(config, testingRun, maxSessionsToBill):
    # Verify this subscription with stripe
    subscription = stripe.Subscription.retrieve(testingRun.stripeSubscriptionId)
    if subscription is None:
        print("Error! Did not find the Stripe subscription object for this testing run.")
        return False

    stripe.SubscriptionItem.create_usage_record(
        subscription.items.configData[0].id,
        quantity=config['testing_sequence_length'] * min(maxSessionsToBill, config['web_session_parallel_execution_sessions']),
        timestamp=datetime.datetime.now().timestamp(),
        action='increment',
    )


@celeryApplication.task(queue="testing", acks_late=True)
def runOneTestingStepForRun(testingRunId, testingStepsCompleted, maxSessionsToBill):
    print(f"Starting testing step for testing run {testingRunId}")

    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        print(f"Error! {testingRunId} not found.")
        return {"success": False}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
        return {"success": False}

    configDir = mountTestingRunStorageDrive(testingRunId)
    if configDir is None:
        return {"success": False}

    try:
        config = Configuration(configDir)

        shouldBeRandom = False
        if testingStepsCompleted < (config['training_random_initialization_sequences']):
            shouldBeRandom = True

        testingStep = TestingStep(id=CustomIDField.generateNewUUID(TestingStep, config), testingRunId=testingRunId)
        testingStep.saveToDisk(config)

        result = RunTestingStep.runTestingStep(configDir, str(testingStep.id), shouldBeRandom)

        attachUsageBilling(config, run, maxSessionsToBill)

        print(f"Finished testing step for testing run {testingRunId}")

        return result
    finally:
        unmountTestingRunStorageDrive(configDir)


@celeryApplication.task(queue="training", acks_late=True)
def runOneTrainingStepForRun(testingRunId, trainingStepsCompleted):
    print(f"Starting training step for testing run {testingRunId}")
    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        print(f"Error! {testingRunId} not found.")
        return {"success":False}

    # Verify this subscription with stripe
    if not verifyStripeSubscription(run):
        return {"success": False}

    configDir = mountTestingRunStorageDrive(testingRunId)
    if configDir is None:
        return {"success":False}

    try:
        config = Configuration(configDir)

        trainingStep = TrainingStep(id=CustomIDField.generateNewUUID(TrainingStep, config))
        trainingStep.saveToDisk(config)

        result = RunTrainingStep.runTrainingStep(configDir, str(trainingStep.id), trainingStepsCompleted, gpu=0)

        print(f"Completed training step for testing run {testingRunId}")
        return result
    finally:
        unmountTestingRunStorageDrive(configDir)




@celeryApplication.task(
    queue="default",
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=1,
    retry_backoff_max=60,
    retry_kwargs={'max_retries': 100},
    retry_jitter=True,
    acks_late=True
)
def runTesting(testingRunId):
    print(f"Starting testing run {testingRunId}")
    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        print(f"Error! {testingRunId} not found.")
        return

    configDir = mountTestingRunStorageDrive(testingRunId)
    if configDir is None:
        return {"success":False}

    if run.startTime is None:
        run.startTime = datetime.datetime.now()

    run.status = "running"
    run.save()

    try:
        configFilePath = os.path.join(configDir, "kwola.json")

        runConfiguration = run.configuration

        if not os.path.exists(configFilePath):
            kwolaConfigData = getKwolaConfigurationData()

            kwolaConfigData['url'] = runConfiguration.url
            kwolaConfigData['email'] = runConfiguration.email
            kwolaConfigData['password'] = runConfiguration.password
            kwolaConfigData['name'] = runConfiguration.name
            kwolaConfigData['paragraph'] = runConfiguration.paragraph
            kwolaConfigData['enableRandomNumberCommand'] = runConfiguration.enableRandomNumberCommand
            kwolaConfigData['enableRandomBracketCommand'] = runConfiguration.enableRandomBracketCommand
            kwolaConfigData['enableRandomMathCommand'] = runConfiguration.enableRandomMathCommand
            kwolaConfigData['enableRandomOtherSymbolCommand'] = runConfiguration.enableRandomOtherSymbolCommand
            kwolaConfigData['enableDoubleClickCommand'] = runConfiguration.enableDoubleClickCommand
            kwolaConfigData['enableRightClickCommand'] = runConfiguration.enableRightClickCommand
            kwolaConfigData['autologin'] = runConfiguration.autologin
            kwolaConfigData['prevent_offsite_links'] = runConfiguration.preventOffsiteLinks
            kwolaConfigData['testing_sequence_length'] = runConfiguration.testingSequenceLength

            with open(configFilePath, 'wt') as configFile:
                json.dump(kwolaConfigData, configFile)
        else:
            with open(configFilePath, 'rt') as configFile:
                kwolaConfigData = json.load(configFile)

        # We load up a single web session just to ensure we can access the target url
        config = Configuration(configDir)
        environment = WebEnvironment(config, sessionLimit=1)
        environment.shutdown()
        del environment

        # Now we just loop until completion
        countTestingSessionsStarted = 0
        countTestingSessionsNeeded = 0

        # Make a purely rule-of-thumb estimate on how long an average testing session should take, in seconds
        expectedSessionTime = runConfiguration.testingSequenceLength * 20

        remainingTestingSessions = runConfiguration.totalTestingSessions - run.testingSessionsCompleted

        targetFinishedLaunchingTime = run.startTime \
                       + datetime.timedelta(hours=run.configuration.hours) \
                       - datetime.timedelta(seconds=expectedSessionTime)

        timeRemaining = max(1, (targetFinishedLaunchingTime - datetime.datetime.now()).total_seconds())

        testingSessionsPerSecond = remainingTestingSessions / timeRemaining

        trainingIterationsNeededPerSession = (kwolaConfigData['iterations_per_sample'] * runConfiguration.testingSequenceLength) / (kwolaConfigData['batch_size'] * kwolaConfigData['batches_per_iteration'])

        countTrainingIterationsNeeded = 0
        countTrainingIterationsCompleted = 0

        startTime = datetime.datetime.now()

        testingStepActiveFutures = []
        testingStepCompletedFutures = []

        completedTrainingSteps = run.trainingStepsCompleted
        completedTestingSteps = int(run.testingSessionsCompleted / kwolaConfigData['web_session_parallel_execution_sessions'])
        currentTrainingStepFuture = None
        shouldExit = False

        while run.testingSessionsCompleted < runConfiguration.totalTestingSessions and not shouldExit:
            timeElapsed = (datetime.datetime.now() - startTime).total_seconds()

            countTestingSessionsNeeded = min(remainingTestingSessions, timeElapsed * testingSessionsPerSecond)

            while countTestingSessionsStarted < countTestingSessionsNeeded:
                print(f"Starting a testing step for run {testingRunId}")
                future = runOneTestingStepForRun.apply_async(args=[testingRunId, completedTestingSteps, countTestingSessionsNeeded - countTestingSessionsStarted])
                testingStepActiveFutures.append(future)
                countTestingSessionsStarted += kwolaConfigData['web_session_parallel_execution_sessions']

            toRemove = []
            for future in testingStepActiveFutures:
                if future.ready():
                    print("Ready future has been found!")
                    toRemove.append(future)
            for future in toRemove:
                testingStepActiveFutures.remove(future)
                testingStepCompletedFutures.append(future)
                # We only count this testing step if it actually completed successfully, because
                # otherwise it needs to be done over again.
                if future.successful():
                    result = future.get(disable_sync_subtasks=False)
                    if isinstance(result, dict) and result['success']:
                        print(f"Finished a testing step for run {testingRunId}")
                        countTrainingIterationsNeeded += trainingIterationsNeededPerSession * kwolaConfigData['web_session_parallel_execution_sessions']
                        run.testingSessionsCompleted += kwolaConfigData['web_session_parallel_execution_sessions']
                        completedTestingSteps += 1
                        run.save()
                    else:
                        print("Testing run appears to have failed. Trying it again...")
                        # Double check that the stripe subscription is still good. If the testing step failed because our
                        # stripe subscription is bad, we should just exit immediately.
                        if not verifyStripeSubscription(run):
                            shouldExit = True
                            break

            if countTrainingIterationsCompleted < countTrainingIterationsNeeded and currentTrainingStepFuture is None:
                print(f"Starting a training step for run {testingRunId}")
                currentTrainingStepFuture = runOneTrainingStepForRun.apply_async(args=[testingRunId, completedTrainingSteps])

            if currentTrainingStepFuture is not None and currentTrainingStepFuture.ready():
                print(f"Finished a training step for run {testingRunId}")
                currentTrainingStepFuture = None
                countTrainingIterationsCompleted += kwolaConfigData['iterations_per_training_step']
                completedTrainingSteps += 1
                run.trainingStepsCompleted += 1
                run.save()

            if timeElapsed > kwolaConfigData.get('testing_run_max_time_before_refresh', 3600):
                shouldExit = True

            time.sleep(1)

        if currentTrainingStepFuture is not None:
            currentTrainingStepFuture.wait(disable_sync_subtasks=False)

            completedTrainingSteps += 1
            run.trainingStepsCompleted += 1
            run.save()

        for future in testingStepActiveFutures:
            future.wait(disable_sync_subtasks=False)

            run.testingSessionsCompleted += kwolaConfigData['web_session_parallel_execution_sessions']
            completedTestingSteps += 1
            run.save()

        if run.testingSessionsCompleted < runConfiguration.totalTestingSessions:
            print(f"Refreshing testing run {testingRunId}")
            runTesting.delay(testingRunId)
        else:
            print(f"Finished testing run {testingRunId}")
            run.status = "completed"
            run.save()

    finally:
        unmountTestingRunStorageDrive(configDir)


