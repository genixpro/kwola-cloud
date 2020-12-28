#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from .BehaviourChangeDetectionTask import runBehaviourChangeDetectionAlgorithm
from kwola.tasks.TaskProcess import TaskProcess
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess

if __name__ == "__main__":
    initializeKwolaCloudProcess()

    task = TaskProcess(runBehaviourChangeDetectionAlgorithm)
    task.run()


