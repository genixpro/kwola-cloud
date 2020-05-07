#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from ..app import celeryApplication
from ..datamodels.TestingRun import TestingRun

@celeryApplication.task
def runTesting(testingRunId):
    run = TestingRun.objects(id=testingRunId).first()

    if run is None:
        print(f"Error! {testingRunId} not found.")
        return


