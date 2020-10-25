import matplotlib.pyplot as plt
import billiard as multiprocessing
from ...datamodels.TestingStepModel import TestingStep
from ...datamodels.ExecutionSessionModel import ExecutionSession
from ...components.managers.TrainingManager import TrainingManager
from ...datamodels.ExecutionTraceModel import ExecutionTrace
from ...datamodels.TrainingStepModel import TrainingStep
import numpy
import os
import scipy.signal


def averageRewardForTestingStep(config, testingStepId):
    testingStep = TestingStep.loadFromDisk(testingStepId, config)

    stepRewards = []
    for sessionId in testingStep.executionSessions:
        session = ExecutionSession.loadFromDisk(sessionId, config)
        if session.status == "completed":
            stepRewards.append(session.totalReward)

    if len(stepRewards) > 0:
        return numpy.mean(stepRewards)
    else:
        return None


def generateRewardChart(config, applicationId):
    testingSteps = sorted(
        [step for step in TrainingManager.loadAllTestingSteps(config, applicationId=applicationId) if step.status == "completed"],
        key=lambda step: step.startTime, reverse=False)

    rewardValueFutures = []

    pool = multiprocessing.Pool(config['chart_generation_dataload_workers'])

    for step in testingSteps:
        rewardValueFutures.append(pool.apply_async(averageRewardForTestingStep, [config, step.id]))

    rewardValues = [future.get() for future in rewardValueFutures if future.get() is not None]

    fig, ax = plt.subplots()

    rewardValues = scipy.signal.medfilt(rewardValues, kernel_size=9)

    ax.plot(range(len(rewardValues)), rewardValues, color='green')

    ax.set_ylim(0, 15)

    ax.set(xlabel='Testing Step #', ylabel='Reward',
           title='Reward per session')
    ax.grid()

    fig.savefig(f"{config.getKwolaUserDataDirectory('charts')}/reward_chart.png")

    pool.close()
    pool.join()


def averageCoverageForTestingStep(config, testingStepId):
    testingStep = TestingStep.loadFromDisk(testingStepId, config)

    stepCoverage = []
    for sessionId in testingStep.executionSessions:
        session = ExecutionSession.loadFromDisk(sessionId, config)
        if session.status == "completed":
            lastTrace = ExecutionTrace.loadFromDisk(session.executionTraces[-1], config)
            stepCoverage.append(lastTrace.cumulativeBranchCoverage)

    if len(stepCoverage) > 0:
        return numpy.mean(stepCoverage)
    else:
        return None

def generateCoverageChart(config, applicationId):
    testingSteps = sorted(
        [step for step in TrainingManager.loadAllTestingSteps(config, applicationId=applicationId) if step.status == "completed"],
        key=lambda step: step.startTime, reverse=False)

    coverageValueFutures = []

    pool = multiprocessing.Pool(config['chart_generation_dataload_workers'])

    for step in testingSteps:
        coverageValueFutures.append(pool.apply_async(averageCoverageForTestingStep, [config, step.id]))

    coverageValues = [future.get() for future in coverageValueFutures if future.get() is not None]

    coverageValues = scipy.signal.medfilt(coverageValues, kernel_size=9)

    fig, ax = plt.subplots()

    ax.plot(range(len(coverageValues)), coverageValues, color='green')

    ax.set(xlabel='Testing Step #', ylabel='Coverage',
           title='Code Coverage')
    ax.grid()

    fig.savefig(f"{config.getKwolaUserDataDirectory('charts')}/coverage_chart.png")

    pool.close()
    pool.join()

def findAllTrainingStepIds(config, applicationId=None):
    trainStepsDir = config.getKwolaUserDataDirectory("training_steps")

    if config['data_serialization_method']['default'] == 'mongo':
        return [step.id for step in TrainingStep.objects(applicationId=applicationId).no_dereference().only("id")]
    else:
        trainingStepIds = []

        for fileName in os.listdir(trainStepsDir):
            if ".lock" not in fileName:
                stepId = fileName
                stepId = stepId.replace(".json", "")
                stepId = stepId.replace(".gz", "")
                stepId = stepId.replace(".pickle", "")

                trainingStepIds.append(stepId)

        return trainingStepIds

def loadTrainingStepLossData(config, trainingStepId, attribute):
    step = TrainingStep.loadFromDisk(trainingStepId, config)
    losses = getattr(step, attribute)
    if len(losses) > 0:
        return numpy.mean(losses), step.startTime, step.status
    else:
        return 0, step.startTime, step.status

def generateLossChart(config, applicationId, attribute, title, fileName):
    trainingStepIds = findAllTrainingStepIds(config, applicationId=applicationId)

    pool = multiprocessing.Pool(config['chart_generation_dataload_workers'])

    lossValueFutures = []
    for id in trainingStepIds:
        lossValueFutures.append(pool.apply_async(loadTrainingStepLossData, [config, id, attribute]))

    lossValuesSorted = sorted(
        [future.get() for future in lossValueFutures if future.get()[2] == "completed"],
        key=lambda result: result[1], reverse=False)

    lossValues = [result[0] for result in lossValuesSorted]

    fig, ax = plt.subplots()

    lossValues = scipy.signal.medfilt(lossValues, kernel_size=9)

    ax.plot(range(len(lossValues)), lossValues, color='green')

    ax.set_ylim(0, numpy.percentile(lossValues, 99))

    ax.set(xlabel='Training Step #', ylabel='Reward', title=title)
    ax.grid()

    fig.savefig(f"{config.getKwolaUserDataDirectory('charts')}/{fileName}")

    pool.close()
    pool.join()


def generateAllCharts(config, applicationId=None):
    pool = multiprocessing.Pool(config['chart_generation_workers'])

    pool.apply_async(generateRewardChart, [config, applicationId])
    pool.apply_async(generateCoverageChart, [config, applicationId])
    pool.apply_async(generateLossChart, [config, applicationId, 'totalLosses', "Total Loss", 'total_loss_chart.png'])
    pool.apply_async(generateLossChart, [config, applicationId, 'presentRewardLosses', "Present Reward Loss", 'present_reward_loss_chart.png'])
    pool.apply_async(generateLossChart, [config, applicationId, 'discountedFutureRewardLosses', "Discounted Future Reward Loss", 'discounted_future_reward_loss_chart.png'])
    pool.apply_async(generateLossChart, [config, applicationId, 'stateValueLosses', "State Value Loss", 'state_value_loss_chart.png'])
    pool.apply_async(generateLossChart, [config, applicationId, 'advantageLosses', "Advantage Los", 'advantage_loss_chart.png'])
    pool.apply_async(generateLossChart, [config, applicationId, 'actionProbabilityLosses', "Action Probability Loss", 'action_probability_loss_chart.png'])

    pool.close()
    pool.join()
