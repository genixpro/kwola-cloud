#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from .BugReproductionTask import runBugReproductionAlgorithm
from kwola.tasks.TaskProcess import TaskProcess
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess

if __name__ == "__main__":
    initializeKwolaCloudProcess()

    task = TaskProcess(runBugReproductionAlgorithm)
    task.run()


