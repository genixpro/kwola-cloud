#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#



from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from kwola.components.utils.retry import autoretry
from kwolacloud.components.managers.TestingRunManager import TestingRunManager

@autoretry()
def runTesting(testingRunId):
    manager = TestingRunManager(testingRunId)
    manager.runTesting()


if __name__ == "__main__":
    task = KubernetesJobProcess(runTesting)
    task.run()


