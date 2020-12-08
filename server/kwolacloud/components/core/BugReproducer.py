#
#     Kwola is an AI algorithm that learns how to use other programs
#     automatically so that it can find bugs in them.
#
#     Copyright (C) 2020 Kwola Software Testing Inc.
#
#     This program is free software: you can redistribute it and/or modify
#     it under the terms of the GNU Affero General Public License as
#     published by the Free Software Foundation, either version 3 of the
#     License, or (at your option) any later version.
#
#     This program is distributed in the hope that it will be useful,
#     but WITHOUT ANY WARRANTY; without even the implied warranty of
#     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#     GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

from kwola.components.environments.WebEnvironment import WebEnvironment
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from datetime import datetime
import random
import numpy
import copy
import logging

class BugReproducer:
    """
        This class manages the process of reproducing bugs.
    """

    def __init__(self, config):
        self.config = config

    def findShortestPathReproduction(self, bug):
        currentActionList = bug.actionsPerformed[:bug.stepNumber + 1]

        # First we test if this bug can be reproduced at all
        successes = self.testReproductions([currentActionList], bug)

        if not successes[0]:
            return (False, currentActionList)

        # Next, we attempt to remove chunks of the action list and see if they still reproduce
        failuresFindingReduction = 0
        while failuresFindingReduction < 3 and len(currentActionList) > 1:
            actionLists = []
            removalBooleanLists = []
            for n in range(10):
                actionList, removals = self.createCoarseGrainReducedActionList(currentActionList)

                actionLists.append(actionList)
                removalBooleanLists.append(removals)

            currentActionList, foundReduction = self.testReproductionWithReducedActionLists(currentActionList, bug, actionLists, removalBooleanLists)
            if not foundReduction:
                failuresFindingReduction += 1

        testRemoveActionIndexes = list(range(len(currentActionList) - 1))
        lastLength = len(currentActionList)
        while len(testRemoveActionIndexes) > 0:
            actionLists = []
            removalBooleanLists = []
            for n in range(min(10, len(testRemoveActionIndexes))):
                actionList, removals = self.createFineGrainReducedActionList(currentActionList, testRemoveActionIndexes.pop(0))

                actionLists.append(actionList)
                removalBooleanLists.append(removals)

            currentActionList, foundReduction = self.testReproductionWithReducedActionLists(currentActionList, bug, actionLists, removalBooleanLists)

            if foundReduction:
                numberRemoved = lastLength - len(currentActionList)
                lastLength = len(currentActionList)

                testRemoveActionIndexes = [index - numberRemoved for index in testRemoveActionIndexes]

        return (True, currentActionList)

    def testReproductionWithReducedActionLists(self, currentActionList, bug, actionLists, removalBooleanLists):
        didReproduce = self.testReproductions(actionLists, bug)

        foundReduction = any(didReproduce)

        if foundReduction:
            if len([r for r in didReproduce if r]) > 1:
                # First we attempt to do a reproduction while removing all actions that weren't deemed necessary
                fullyReducedActionList = [
                    action for actionIndex, action in enumerate(currentActionList)
                    if all([not removals[actionIndex]
                            for listIndex, removals in enumerate(removalBooleanLists)
                            if didReproduce[listIndex]]
                           )
                ]

                didReproduceFullyReduced = self.testReproductions([fullyReducedActionList], bug)[0]

                if didReproduceFullyReduced:
                    currentActionList = fullyReducedActionList
                else:
                    # Just take the largest successful reduction
                    minLength = None
                    for actionListIndex, actionList in enumerate(actionLists):
                        if didReproduce[actionListIndex]:
                            if minLength is None or len(actionList) < minLength:
                                minLength = len(actionList)
                                currentActionList = actionList
            else:
                for actionListIndex, actionList in enumerate(actionLists):
                    if didReproduce[actionListIndex]:
                        currentActionList = actionList
                        break

        return currentActionList, foundReduction


    def createCoarseGrainReducedActionList(self, actions):
        startLocation = random.randint(0, len(actions) - 2)
        removeSize = random.randint(1, len(actions) - 1 - startLocation)

        removalBooleans = [(index >= startLocation and index <= (startLocation + removeSize)) for index in range(len(actions))]
        newActionList = [action for action, shouldRemove in zip(actions, removalBooleans) if not shouldRemove]


        return newActionList, removalBooleans

    def createFineGrainReducedActionList(self, actions, removeActionIndex):
        removalBooleans = [bool(index == removeActionIndex) for index in range(len(actions))]
        newActionList = [action for action, shouldRemove in zip(actions, removalBooleans) if not shouldRemove]

        return newActionList, removalBooleans

    def testReproductions(self, actionLists, bug):
        executionSessions = [
            ExecutionSession(
                id=str(bug.id) + "_reproduction_" + str(listIndex),
                owner=bug.owner,
                status="running",
                testingStepId=bug.testingStepId,
                testingRunId=bug.testingRunId,
                applicationId=bug.applicationId,
                startTime=datetime.now(),
                endTime=None,
                tabNumber=listIndex,
                executionTraces=[],
                browser=bug.browser,
                windowSize=bug.windowSize
            )
            for listIndex in range(len(actionLists))
        ]

        # self.config['web_session_headless'] = False

        environment = WebEnvironment(config=self.config, sessionLimit=len(actionLists), executionSessions=executionSessions, plugins=[], browser=bug.browser, windowSize=bug.windowSize)

        longestActionList = numpy.max([len(actionList) for actionList in actionLists])

        didReproduceSuccessfully = {}

        for actionIndex in range(longestActionList):
            actions = []
            actionMapLists = environment.getActionMaps()
            for actionList, actionMaps in zip(actionLists, actionMapLists):
                if actionIndex < len(actionList):
                    action = self.createReproductionActionFromOriginal(actionList[actionIndex], actionMaps)

                    actions.append(action)
                else:
                    actions.append(None)

            logging.info(f"Running action {actionIndex}")
            traces = environment.runActions(actions)
            for actionListIndex, actionList, trace in zip(range(len(actionLists)), actionLists, traces):
                if actionIndex == (len(actionList) - 1):
                    if trace is None:
                        logging.info(f"Trace is None at {actionIndex}")
                        didReproduceSuccessfully[actionListIndex] = False
                    else:
                        didOneMatch = False
                        for error in trace.errorsDetected:
                            if error.isDuplicateOf(bug.error):
                                didOneMatch = True
                                break

                        if didOneMatch:
                            didReproduceSuccessfully[actionListIndex] = True
                        else:
                            didReproduceSuccessfully[actionListIndex] = False

        # environment.runSessionCompletedHooks()

        return [didReproduceSuccessfully.get(index, False) for index in range(len(actionLists))]



    def createReproductionActionFromOriginal(self, action, actionMaps):
        closestOriginal = None
        closestCurrent = None
        closestKeywordSimilarity = None
        closestCornerDist = None
        for currentActionMap in actionMaps:
            if not currentActionMap.canRunAction(action):
                continue

            keywords = set(currentActionMap.keywords.split())
            for originalActionMap in action.intersectingActionMaps:
                if not originalActionMap.canRunAction(action):
                    continue

                originalKeywords = set(originalActionMap.keywords.split())
                similarity = len(keywords.intersection(originalKeywords)) / len(keywords.union(originalKeywords))
                cornerDist = abs(currentActionMap.left - originalActionMap.left) + \
                             abs(currentActionMap.right - originalActionMap.right) + \
                             abs(currentActionMap.top - originalActionMap.top) + \
                             abs(currentActionMap.bottom - originalActionMap.bottom)

                if closestCurrent is None or similarity > closestKeywordSimilarity:
                    closestKeywordSimilarity = similarity
                    closestCornerDist = cornerDist
                    closestCurrent = currentActionMap
                    closestOriginal = originalActionMap
                elif similarity == closestKeywordSimilarity and cornerDist < closestCornerDist:
                    closestKeywordSimilarity = similarity
                    closestCornerDist = cornerDist
                    closestCurrent = currentActionMap
                    closestOriginal = originalActionMap

        if closestOriginal is not None:
            # print("FOUND!", closestOriginal.to_json(), closestCurrent.to_json(), closestKeywordSimilarity, closestCornerDist)
            action = copy.deepcopy(action)
            action.x += closestCurrent.left - closestOriginal.left
            action.y += closestCurrent.top - closestOriginal.top
        # else:
        #     print(action.to_json())

        return action
