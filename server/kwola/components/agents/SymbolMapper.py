from ..utils.file import loadKwolaFileData, saveKwolaFileData
import pickle
import numpy
import pprint
import copy
import traceback
import os.path


class LineOfCodeSymbolMapping:
    def __init__(self, branchTrace, recentSymbolIndex, coverageSymbolIndex):
        self.branchTrace = {fileName: numpy.copy(trace) for fileName, trace  in branchTrace.items()}
        self.recentSymbolIndex = recentSymbolIndex
        self.coverageSymbolIndex = coverageSymbolIndex

    def linesOfCodeMatched(self):
        total = 0
        for fileName in self.branchTrace.keys():
            total += numpy.count_nonzero(self.branchTrace[fileName])
        return total


    def __repr__(self):
        return pprint.pformat({fileName: list(numpy.nonzero(trace)[0]) for fileName, trace in self.branchTrace.items()})

class SymbolMapper:
    def __init__(self, config):
        self.knownFiles = set()

        self.nextSymbolIndex = 1

        self.symbolMap = {

        }

        self.allSymbols = []

        self.symbolMapPath = os.path.join(config.getKwolaUserDataDirectory("models"), "symbol_mapper")

        self.config = config

    @staticmethod
    def branchCoveredSymbol(fileName, branchIndex):
        return f'{branchIndex}-{fileName}-covered-branch'

    @staticmethod
    def branchRecentlyExecutedSymbol(fileName, branchIndex):
        return f'{branchIndex}-{fileName}-recently-executed-branch'

    def load(self):
        # We also need to load the symbol map - this is the mapping between symbol strings
        # and their index values within the embedding structure
        symbolMapData = loadKwolaFileData(self.symbolMapPath, self.config, printErrorOnFailure=False)
        if symbolMapData is not None:
            (self.symbolMap, self.knownFiles, self.nextSymbolIndex, self.allSymbols) = pickle.loads(symbolMapData)

    def save(self):
        fileData = pickle.dumps((self.symbolMap, self.knownFiles, self.nextSymbolIndex, self.allSymbols), protocol=pickle.HIGHEST_PROTOCOL)
        saveKwolaFileData(self.symbolMapPath, fileData, self.config)


    def findNextLOCSymbolMapping(self, fileName, branchTrace):
        positiveIndexes = numpy.flatnonzero(branchTrace > 0)

        index = 0

        branchIndex = positiveIndexes[index]
        locSymbolMapping = self.symbolMap.get((fileName, branchIndex))
        while locSymbolMapping is None:
            index += 1
            if index >= len(positiveIndexes):
                break

            branchIndex = positiveIndexes[index]
            locSymbolMapping = self.symbolMap.get((fileName, branchIndex))

        if locSymbolMapping is None:
            return None, None
        else:
            return locSymbolMapping, branchIndex

    def computeCoverageSymbolsList(self, executionTrace):
        symbols = []
        weights = []
        localBranchTraces = {}

        for fileName in executionTrace.cachedStartCumulativeBranchTrace:
            branchTrace = numpy.array(executionTrace.cachedStartCumulativeBranchTrace[fileName])
            branchTrace = numpy.minimum(numpy.ones_like(branchTrace), branchTrace)

            localBranchTraces[fileName] = branchTrace

        for fileName in localBranchTraces.keys():
            while numpy.argwhere(localBranchTraces[fileName] > 0).size > 0:
                locSymbolMapping, branchIndex = self.findNextLOCSymbolMapping(fileName, localBranchTraces[fileName])

                if locSymbolMapping is not None:
                    for locTraceFileName in locSymbolMapping.branchTrace:
                        if locTraceFileName in localBranchTraces:
                            localBranchTraces[locTraceFileName] -= locSymbolMapping.branchTrace[locTraceFileName]
                    symbols.append(locSymbolMapping.recentSymbolIndex)
                    weights.append(1.0)
                else:
                    break

        return symbols, weights


    def computeDecayingBranchTraceSymbolsList(self, executionTrace):
        symbols = []
        weights = []
        localBranchTraces = {}

        for fileName in executionTrace.cachedStartDecayingBranchTrace:
            branchTrace = numpy.array(executionTrace.cachedStartDecayingBranchTrace[fileName])
            branchTrace = numpy.minimum(numpy.ones_like(branchTrace), branchTrace)

            localBranchTraces[fileName] = branchTrace

        for fileName in localBranchTraces.keys():
            while numpy.argwhere(localBranchTraces[fileName] > 0).size > 0:
                locSymbolMapping, branchIndex = self.findNextLOCSymbolMapping(fileName, localBranchTraces[fileName])

                if locSymbolMapping is not None:
                    for locTraceFileName in locSymbolMapping.branchTrace:
                        if locTraceFileName in localBranchTraces:
                            localBranchTraces[locTraceFileName] -= locSymbolMapping.branchTrace[locTraceFileName]
                    symbols.append(locSymbolMapping.coverageSymbolIndex)
                    weights.append(executionTrace.cachedStartDecayingBranchTrace[fileName][branchIndex])
                else:
                    break

        return symbols, weights


    def computeDecayingFutureBranchTraceSymbolsList(self, executionTrace):
        symbols = []
        weights = []
        localBranchTraces = {}

        for fileName in executionTrace.cachedEndDecayingFutureBranchTrace:
            branchTrace = numpy.array(executionTrace.cachedEndDecayingFutureBranchTrace[fileName])
            branchTrace = numpy.minimum(numpy.ones_like(branchTrace), branchTrace)

            localBranchTraces[fileName] = branchTrace

        for fileName in localBranchTraces.keys():
            while numpy.argwhere(localBranchTraces[fileName] > 0).size > 0:
                locSymbolMapping, branchIndex = self.findNextLOCSymbolMapping(fileName, localBranchTraces[fileName])

                if locSymbolMapping is not None:
                    for locTraceFileName in locSymbolMapping.branchTrace:
                        if locTraceFileName in localBranchTraces:
                            localBranchTraces[locTraceFileName] -= locSymbolMapping.branchTrace[locTraceFileName]
                    symbols.append(locSymbolMapping.coverageSymbolIndex)
                    weights.append(executionTrace.cachedEndDecayingFutureBranchTrace[fileName][branchIndex])
                else:
                    break

        return symbols, weights


    def computeAllSymbolsForTrace(self, executionTrace):
        allSymbolList = []
        allWeightList = []

        symbols, weights = self.computeCoverageSymbolsList(executionTrace)
        allSymbolList.extend(symbols)
        allWeightList.extend(weights)

        symbols, weights = self.computeDecayingBranchTraceSymbolsList(executionTrace)
        allSymbolList.extend(symbols)
        allWeightList.extend(weights)

        return allSymbolList, allWeightList

    def assignNewSymbols(self, executionTraces):
        """
            This method will go through all of the execution traces provided, and for each one,
            it will check to see if there were any new symbols seen that need to be assigned.
            Symbols can be anything from a line of code being executed through to an interaction
            with a particular path or url or variable name. Basically they are a way of giving the
            model an indication of what state its in and what has happened recently, visa via
            these symbols which become neural network embeddings.

            :param executionTraces: A list or generator providing kwola.datamodels.ExecutionTraceModel objects

            :return: An integer providing the number of new symbols added


        """

        newSymbolMaps = []
        removedSymbolMaps = []

        splitSymbolsCount = 0
        netNewSymbolsCount = 0

        for trace in executionTraces:
            localBranchTraces = {}

            for fileName in trace.branchTrace.keys():
                branchTrace = numpy.array(trace.branchTrace[fileName])
                branchTrace = numpy.minimum(numpy.ones_like(branchTrace), branchTrace)
                localBranchTraces[fileName] = branchTrace

            createNewLOCMap = False

            symbolMapFound = True
            while symbolMapFound:
                symbolMapFound = False
                for fileName in localBranchTraces.keys():
                    if numpy.argwhere(localBranchTraces[fileName] > 0).size > 0:
                        locSymbolMapping, branchIndex = self.findNextLOCSymbolMapping(fileName, localBranchTraces[fileName])

                        if locSymbolMapping is not None:
                            symbolMapFound = True

                            negativeBranchTraces = {}
                            for locSymbolMapFileName in locSymbolMapping.branchTrace.keys():
                                if locSymbolMapFileName not in localBranchTraces:
                                    localBranchTraces[locSymbolMapFileName] = numpy.zeros_like(locSymbolMapping.branchTrace[locSymbolMapFileName])

                                localBranchTraces[locSymbolMapFileName] -= locSymbolMapping.branchTrace[locSymbolMapFileName]

                                negatives = numpy.minimum(localBranchTraces[locSymbolMapFileName], numpy.zeros_like(localBranchTraces[locSymbolMapFileName]))

                                if numpy.count_nonzero(negatives) > 0:
                                    negativeBranchTraces[locSymbolMapFileName] = negatives

                                localBranchTraces[locSymbolMapFileName] = numpy.maximum(localBranchTraces[locSymbolMapFileName], numpy.zeros_like(localBranchTraces[locSymbolMapFileName]))

                            if len(negativeBranchTraces):
                                splitSymbolsCount += 1

                                # We have to split the previous line of code symbol mapping into two separate mappings, because those lines of code have been observed
                                # to occur separately
                                firstNewSymbolMap = LineOfCodeSymbolMapping({
                                    locSymbolMapFileName: branchTrace for locSymbolMapFileName, branchTrace in locSymbolMapping.branchTrace.items()
                                }, None, None)

                                for negativeFileName in negativeBranchTraces.keys():
                                    firstNewSymbolMap.branchTrace[negativeFileName] += negativeBranchTraces[negativeFileName]
                                    if numpy.count_nonzero(firstNewSymbolMap.branchTrace[negativeFileName]) == 0:
                                        del firstNewSymbolMap.branchTrace[negativeFileName]

                                secondNewSymbolMap = LineOfCodeSymbolMapping({
                                    locSymbolMapFileName: numpy.absolute(branchTrace) for locSymbolMapFileName, branchTrace in negativeBranchTraces.items()
                                }, None, None)

                                self.insertLOCSymbolMap(firstNewSymbolMap)
                                self.insertLOCSymbolMap(secondNewSymbolMap)

                                if locSymbolMapping.recentSymbolIndex is None:
                                    newSymbolMaps.remove(locSymbolMapping)
                                else:
                                    removedSymbolMaps.append(locSymbolMapping)

                                newSymbolMaps.append(firstNewSymbolMap)
                                newSymbolMaps.append(secondNewSymbolMap)
                        else:
                            createNewLOCMap = True

                    if symbolMapFound:
                        break

            if createNewLOCMap:
                netNewSymbolsCount += 1
                newSymbolBranchTrace = {}

                for fileName in localBranchTraces.keys():
                    branchTrace = numpy.maximum(numpy.zeros_like(localBranchTraces[fileName]), localBranchTraces[fileName])
                    positiveIndexes = numpy.flatnonzero(branchTrace)

                    if len(positiveIndexes) > 0:
                        newSymbolBranchTrace[fileName] = branchTrace

                newSymbolMap = LineOfCodeSymbolMapping(newSymbolBranchTrace, None, None)

                self.insertLOCSymbolMap(newSymbolMap)

                newSymbolMaps.append(newSymbolMap)


        for locSymbolMapping in newSymbolMaps:
            locSymbolMapping.recentSymbolIndex = self.nextSymbolIndex
            self.nextSymbolIndex += 1

            locSymbolMapping.coverageSymbolIndex = self.nextSymbolIndex
            self.nextSymbolIndex += 1

            for fileName in locSymbolMapping.branchTrace.keys():
                self.knownFiles.add(fileName)

            self.allSymbols.append(locSymbolMapping)

        for locSymbolMapping in removedSymbolMaps:
            self.allSymbols.remove(locSymbolMapping)

        self.validateSymbolMaps()

        return len(newSymbolMaps)


    def insertLOCSymbolMap(self, newSymbolMap):
        for locSymbolMapFileName in newSymbolMap.branchTrace.keys():
            nonZeroIndexes = numpy.nonzero(newSymbolMap.branchTrace[locSymbolMapFileName])[0]
            for branchIndex in nonZeroIndexes:
                self.symbolMap[(locSymbolMapFileName, branchIndex)] = newSymbolMap


    def validateSymbolMaps(self):
        all = set()
        for symbol in self.allSymbols:
            for fileName in symbol.branchTrace.keys():
                indexes = numpy.nonzero(symbol.branchTrace[fileName])[0]
                for index in indexes:
                    key = (fileName, index)
                    if key in all:
                        raise ValueError(f"The symbol map is invalid - there was an overlapping line of code mapping {key}")
                    else:
                        all.add(key)

    def computeCachedCumulativeBranchTraces(self, executionTraces):
        if len(executionTraces) == 0:
            return

        executionTraces[0].cachedStartCumulativeBranchTrace = {
            name: numpy.zeros_like(numpy.array(value))
            for name, value in executionTraces[0].branchTrace.items()
        }

        executionTraces[0].cachedEndCumulativeBranchTrace = {
            name: numpy.array(value)
            for name, value in executionTraces[0].branchTrace.items()
        }

        lastTrace = executionTraces[0]

        for trace in executionTraces[1:]:
            if trace.cachedStartCumulativeBranchTrace is None:
                trace.cachedStartCumulativeBranchTrace = copy.deepcopy(lastTrace.cachedEndCumulativeBranchTrace)
                trace.cachedEndCumulativeBranchTrace = copy.deepcopy(lastTrace.cachedEndCumulativeBranchTrace)

                for fileName in trace.branchTrace.keys():
                    if fileName in trace.cachedEndCumulativeBranchTrace:
                        if len(trace.branchTrace[fileName]) == len(trace.cachedEndCumulativeBranchTrace[fileName]):
                            trace.cachedEndCumulativeBranchTrace[fileName] += numpy.array(trace.branchTrace[fileName])
                    else:
                        trace.cachedEndCumulativeBranchTrace[fileName] = trace.branchTrace[fileName]
            lastTrace = trace


    def computeCachedDecayingBranchTrace(self, executionTraces):
        if len(executionTraces) == 0:
            return

        executionTraces[0].cachedStartDecayingBranchTrace = {
            name: numpy.zeros_like(numpy.array(value))
            for name, value in executionTraces[0].branchTrace.items()
        }

        executionTraces[0].cachedEndDecayingBranchTrace = {
            name: numpy.minimum(numpy.ones_like(value), numpy.array(value)) * self.config['decaying_branch_trace_scale']
            for name, value in executionTraces[0].branchTrace.items()
        }

        lastTrace = executionTraces[0]

        for trace in executionTraces[1:]:
            if trace.cachedStartDecayingBranchTrace is None:
                trace.cachedStartDecayingBranchTrace = copy.deepcopy(lastTrace.cachedEndDecayingBranchTrace)
                trace.cachedEndDecayingBranchTrace = copy.deepcopy(lastTrace.cachedEndDecayingBranchTrace)

                for fileName in trace.cachedEndDecayingBranchTrace.keys():
                    trace.cachedEndDecayingBranchTrace[fileName] *= self.config['decaying_branch_trace_decay_rate']

                for fileName in trace.branchTrace.keys():
                    branchesExecuted = numpy.minimum(numpy.ones_like(trace.branchTrace[fileName]),
                                                     numpy.array(trace.branchTrace[fileName]))*self.config['decaying_branch_trace_scale']

                    if fileName in trace.cachedEndDecayingBranchTrace:
                        if len(trace.branchTrace[fileName]) == len(trace.cachedEndDecayingBranchTrace[fileName]):
                            trace.cachedEndDecayingBranchTrace[fileName] += branchesExecuted
                    else:
                        trace.cachedEndDecayingBranchTrace[fileName] = branchesExecuted

            lastTrace = trace

    def computeCachedDecayingFutureBranchTrace(self, executionTraces):
        # Create the decaying future execution trace for the prediction algorithm
        # The decaying future execution trace is basically a vector that describes
        # what is going to happen in the future. Its similar to the decaying branch
        # trace that is fed as an input to the algorithm. The difference is this.
        # The decaying branch trace shows what happened in the past, with the lines
        # of code that get executed set to 1 in the vector and then decaying thereafter.
        # The decaying future trace is exactly the same but in reverse - it provides
        # what is going to happen next after this trace. The lines of code which
        # execute immediately next are set to 1, and ones that execute further in the
        # future have some decayed value based on the decay rate. What this does is
        # provide an additional, highly supervised target for a secondary loss function.

        if len(executionTraces) == 0:
            return

        reversedExecutionTraces = list(executionTraces)
        reversedExecutionTraces.reverse()

        reversedExecutionTraces[0].cachedEndDecayingFutureBranchTrace = {
            name: numpy.zeros_like(value)
            for name, value in reversedExecutionTraces[0].branchTrace.items()
        }

        reversedExecutionTraces[0].cachedStartDecayingFutureBranchTrace = {
            name: numpy.minimum(numpy.ones_like(value), numpy.array(value)) * self.config['decaying_future_branch_trace_scale']
            for name, value in reversedExecutionTraces[0].branchTrace.items()
        }

        nextTrace = reversedExecutionTraces[0]

        for trace in reversedExecutionTraces[1:]:
            if trace.cachedStartDecayingFutureBranchTrace is None:
                trace.cachedStartDecayingFutureBranchTrace = copy.deepcopy(nextTrace.cachedStartDecayingFutureBranchTrace)

                trace.cachedEndDecayingFutureBranchTrace = copy.deepcopy(nextTrace.cachedStartDecayingFutureBranchTrace)

                for fileName in trace.cachedStartDecayingFutureBranchTrace.keys():
                    trace.cachedStartDecayingFutureBranchTrace[fileName] *= self.config['decaying_future_execution_trace_decay_rate']

                for fileName in trace.branchTrace.keys():
                    traceNumpyArray = numpy.array(trace.branchTrace[fileName])

                    branchesExecuted = numpy.minimum(numpy.ones_like(traceNumpyArray), traceNumpyArray) * self.config['decaying_future_branch_trace_scale']

                    if fileName in trace.cachedStartDecayingFutureBranchTrace:
                        if len(trace.branchTrace[fileName]) == len(trace.cachedStartDecayingFutureBranchTrace[fileName]):
                            trace.cachedStartDecayingFutureBranchTrace[fileName] += branchesExecuted
                    else:
                        trace.cachedStartDecayingFutureBranchTrace[fileName] = branchesExecuted

            nextTrace = trace
