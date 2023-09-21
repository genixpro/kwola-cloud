#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#



from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from kwola.components.utils.retry import autoretry
from kwolacloud.components.managers.TestingRunManager import TestingRunManager

@autoretry()
def runTesting(testingRunId):
    manager = TestingRunManager(testingRunId)
    return manager.runTesting()


if __name__ == "__main__":
    task = KubernetesJobProcess(runTesting)
    task.run()


