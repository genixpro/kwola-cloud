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
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwolacloud.datamodels.BehaviouralDifference import BehaviouralDifference
from kwola.config.logger import getLogger
from kwola.components.utils.retry import autoretry
from kwolacloud.datamodels.id_utility import generateKwolaId
from datetime import datetime
import random
import numpy
import re
import math
import copy
import logging
import pickle
import bz2
import scipy.optimize
from bs4 import BeautifulSoup, NavigableString



class BehaviourChangeDetector:
    """
        This class manages the regression testing process.
    """

    def __init__(self, config):
        self.config = config
        self.cumulativeBranchTrace = {}

        self.keywordAttributes = [
            'id',
            'name',
            'class',
            'type',
            'placeholder',
            'title',
            'aria-label',
            'aria-placeholder',
            'aria-roledescription'
        ]

        self.whitespaceRegex = re.compile(r"\s+")


    def saveCumulativeBranchTrace(self):
        saveData = pickle.dumps(self.cumulativeBranchTrace)
        self.config.saveKwolaFileData("regression", "regression_branch_tracer", saveData)


    def loadCumulativeBranchTrace(self):
        data = self.config.loadKwolaFileData("regression", "regression_branch_tracer")
        if data is not None:
            self.cumulativeBranchTrace = pickle.loads(data)


    def resetCumulativeBranchTrace(self):
        self.cumulativeBranchTrace = {}
        self.saveCumulativeBranchTrace()


    def computeExecutionSessionIdsForChangeDetection(self, executionTraces):
        tracesWithNewBranches = set()
        allSessionIds = set()
        sessionIdsWithNewBranches = set()

        for trace in executionTraces:
            allSessionIds.add(trace.executionSessionId)
            branchTrace = trace.branchTrace
            newBranches = False

            for fileName in branchTrace.keys():
                traceVector = branchTrace[fileName]
                didExecuteFile = bool(numpy.sum(traceVector) > 0)

                if fileName in self.cumulativeBranchTrace:
                    cumulativeTraceVector = self.cumulativeBranchTrace[fileName]

                    if traceVector.shape[0] == cumulativeTraceVector.shape[0]:
                        newBranchCount = numpy.sum(traceVector[cumulativeTraceVector == 0])
                        if newBranchCount > 0:
                            newBranches = True
                    else:
                        if didExecuteFile:
                            newBranches = True
                else:
                    if didExecuteFile:
                        newBranches = True

            if newBranches:
                tracesWithNewBranches.add(trace.id)
                sessionIdsWithNewBranches.add(trace.executionSessionId)

            for fileName in branchTrace.keys():
                if fileName in self.cumulativeBranchTrace:
                    if branchTrace[fileName].shape[0] == self.cumulativeBranchTrace[fileName].shape[0]:
                        self.cumulativeBranchTrace[fileName] = branchTrace[fileName].maximum(self.cumulativeBranchTrace[fileName])
                    else:
                        getLogger().warning(
                            f"Warning! The file with fileName {fileName} has changed the size of its trace vector. This "
                            f"is very unusual and could indicate some strange situation with dynamically loaded javascript")
                else:
                    self.cumulativeBranchTrace[fileName] = branchTrace[fileName]


        getLogger().info(f"Found {len(sessionIdsWithNewBranches)} out of {len(allSessionIds)} session ids that are being marked for regression testing.")

        return sessionIdsWithNewBranches

    @autoretry()
    def findAllChangesForExecutionSession(self, priorExecutionSession, seenDifferenceHashes, newTestingRunId):
        session = ExecutionSession(
            id=str(priorExecutionSession.id) + "-behaviour-change-detection",
            owner=priorExecutionSession.owner,
            status="running",
            testingStepId=None,
            testingRunId=newTestingRunId,
            applicationId=priorExecutionSession.applicationId,
            startTime=datetime.now(),
            endTime=None,
            tabNumber=0,
            executionTraces=[],
            browser=priorExecutionSession.browser,
            windowSize=priorExecutionSession.windowSize,
            useForFutureChangeDetection=False,
            isChangeDetectionSession=True,
            changeDetectionPriorExecutionSessionId=priorExecutionSession.id,
            executionTracesWithChanges=[]
        )

        environment = WebEnvironment(config=self.config, sessionLimit=1, executionSessions=[session], plugins=[], browser=priorExecutionSession.browser, windowSize=priorExecutionSession.windowSize)

        allDifferences = []

        for traceId in priorExecutionSession.executionTraces:
            getLogger().info(f"Detecting changes for trace {traceId}")
            oldTrace = ExecutionTrace.loadFromDisk(traceId, self.config, applicationId=priorExecutionSession.applicationId)

            action = environment.sessions[0].createReproductionActionFromOriginal(oldTrace.actionPerformed)
            newTrace = environment.runActions([action])[0]
            if newTrace is None or environment.sessions[0].hasBrowserDied:
                raise RuntimeError(f"The web browser session has died while trying to reproduce and perform change detection on trace {traceId} for prior session {priorExecutionSession.id}")

            session.executionTraces.append(str(newTrace.id))

            originalHtml = bz2.decompress(self.config.loadKwolaFileData("saved_pages", traceId + ".html"))
            newHtml = bz2.decompress(self.config.loadKwolaFileData("saved_pages", newTrace.id + ".html"))

            differences = self.compareHtml(originalHtml, oldTrace, newHtml, newTrace)

            newDifference = False
            for difference in differences:
                hash = difference.computeDifferenceHash()
                if hash not in seenDifferenceHashes:
                    difference.isDuplicate = False
                    seenDifferenceHashes.add(hash)
                    newDifference = True
                else:
                    difference.isDuplicate = True

                allDifferences.append(difference)

            if newDifference:
                session.executionTracesWithChanges.append(newTrace.id)

        session.status = "completed"
        session.endTime = datetime.now()

        session.saveToDisk(self.config)

        for difference in allDifferences:
            difference.saveToDisk(self.config)

        environment.runSessionCompletedHooks()

        environment.shutdown()


    def compareHtml(self, oldHtml, oldExecutionTrace, newHtml, newExecutionTrace):
        old = BeautifulSoup(oldHtml, features="html.parser")
        new = BeautifulSoup(newHtml, features="html.parser")

        oldStringDatas = self.getAllStringDatas(old)
        newStringDatas = self.getAllStringDatas(new)

        distScoreMatrix = []

        # Now we have to align the two and compute differences
        for oldStringData in oldStringDatas:
            oldCenterX = (oldStringData['left'] + oldStringData['right']) / 2
            oldCenterY = (oldStringData['top'] + oldStringData['bottom']) / 2

            distValues = []
            distScoreMatrix.append(distValues)

            for newStringData in newStringDatas:
                intersectionKeywords = oldStringData['matchKeywords'].intersection(newStringData['matchKeywords'])
                unionKeywords = oldStringData['matchKeywords'].union(newStringData['matchKeywords'])
                iouScore = len(intersectionKeywords) / len(unionKeywords)

                newCenterX = (newStringData['left'] + newStringData['right']) / 2
                newCenterY = (newStringData['top'] + newStringData['bottom']) / 2

                dist = math.sqrt((oldCenterX - newCenterX)*(oldCenterX - newCenterX) + (oldCenterY - newCenterY)*(oldCenterY - newCenterY))

                distScore = (1.0 - iouScore) * 100 + (dist / 1000)

                distValues.append(distScore)

        oldIndexes, newIndexes = scipy.optimize.linear_sum_assignment(numpy.array(distScoreMatrix))

        differences = []

        allOldIndexes = list(range(len(oldStringDatas)))
        allNewIndexes = list(range(len(newStringDatas)))

        for oldIndex, newIndex in zip(oldIndexes, newIndexes):
            oldStringData = oldStringDatas[oldIndex]
            newStringData = newStringDatas[newIndex]
            distScore = distScoreMatrix[oldIndex][newIndex]

            if distScore < 20:
                allOldIndexes.remove(oldIndex)
                allNewIndexes.remove(newIndex)

                if oldStringData['text'] != newStringData['text']:
                    differenceObject = BehaviouralDifference(
                        id=generateKwolaId(BehaviouralDifference, str(newExecutionTrace.owner), self.config),
                        owner=newExecutionTrace.owner,
                        applicationId=newExecutionTrace.applicationId,
                        priorTestingRunId=oldExecutionTrace.testingRunId,
                        newTestingRunId=newExecutionTrace.testingRunId,
                        priorExecutionSessionId=oldExecutionTrace.executionSessionId,
                        newExecutionSessionId=newExecutionTrace.executionSessionId,
                        priorExecutionTraceId=oldExecutionTrace.id,
                        newExecutionTraceId=newExecutionTrace.id,
                        differenceType="changed_text",
                        priorLeft=oldStringData['left'],
                        priorTop=oldStringData['top'],
                        priorBottom=oldStringData['bottom'],
                        priorRight=oldStringData['right'],
                        newLeft=newStringData['left'],
                        newTop=newStringData['top'],
                        newBottom=newStringData['bottom'],
                        newRight=newStringData['right'],
                        priorText=oldStringData['text'],
                        newText=newStringData['text']
                    )

                    differences.append(differenceObject)

        for oldIndex in allOldIndexes:
            oldStringData = oldStringDatas[oldIndex]

            differenceObject = BehaviouralDifference(
                # id=CustomIDField.generateNewUUID(BehaviouralDifference, self.config),
                id=generateKwolaId(BehaviouralDifference, str(newExecutionTrace.owner), self.config),
                owner=newExecutionTrace.owner,
                applicationId=newExecutionTrace.applicationId,
                priorTestingRunId=oldExecutionTrace.testingRunId,
                newTestingRunId=newExecutionTrace.testingRunId,
                priorExecutionSessionId=oldExecutionTrace.executionSessionId,
                newExecutionSessionId=newExecutionTrace.executionSessionId,
                priorExecutionTraceId=oldExecutionTrace.id,
                newExecutionTraceId=newExecutionTrace.id,
                differenceType="deleted_text",
                priorLeft=oldStringData['left'],
                priorTop=oldStringData['top'],
                priorBottom=oldStringData['bottom'],
                priorRight=oldStringData['right'],
                newLeft=None,
                newTop=None,
                newBottom=None,
                newRight=None,
                priorText=oldStringData['text'],
                newText=None
            )

            differences.append(differenceObject)


        for newIndex in allNewIndexes:
            newStringData = newStringDatas[newIndex]

            differenceObject = BehaviouralDifference(
                # id=CustomIDField.generateNewUUID(BehaviouralDifference, self.config),
                id=generateKwolaId(BehaviouralDifference, str(newExecutionTrace.owner), self.config),
                owner=newExecutionTrace.owner,
                applicationId=newExecutionTrace.applicationId,
                priorTestingRunId=oldExecutionTrace.testingRunId,
                newTestingRunId=newExecutionTrace.testingRunId,
                priorExecutionSessionId=oldExecutionTrace.executionSessionId,
                newExecutionSessionId=newExecutionTrace.executionSessionId,
                priorExecutionTraceId=oldExecutionTrace.id,
                newExecutionTraceId=newExecutionTrace.id,
                differenceType="added_text",
                priorLeft=None,
                priorTop=None,
                priorBottom=None,
                priorRight=None,
                newLeft=newStringData['left'],
                newTop=newStringData['top'],
                newBottom=newStringData['bottom'],
                newRight=newStringData['right'],
                priorText=None,
                newText=newStringData['text']
            )

            differences.append(differenceObject)

        return differences



    def getAllStringDatas(self, soup):
        stringDatas = []
        for tag in soup.strings:
            text = self.whitespaceRegex.sub(" ", str(tag).strip())
            if not text:
                continue

            matchKeywords = {text.lower()}
            left = tag.parent['data-kwola-left']
            top = tag.parent['data-kwola-top']
            right = tag.parent['data-kwola-right']
            bottom = tag.parent['data-kwola-bottom']
            isVisible = tag.parent['data-kwola-is-visible']
            isOnTop = tag.parent['data-kwola-is-on-top']

            for parent in tag.parents:
                for matchAttribute in self.keywordAttributes:
                    if matchAttribute in parent.attrs:
                        attributeValue = str(parent.attrs[matchAttribute]).lower()
                        matchKeywords.update(attributeValue.split())

                matchKeywords.add(parent.name)

            data = {
                "text": text,
                "matchKeywords": matchKeywords,
                "left": float(left),
                "right": float(right),
                "top": float(top),
                "bottom": float(bottom)
            }

            if isVisible == "true" and isOnTop == "true":
                stringDatas.append(data)

        return stringDatas

