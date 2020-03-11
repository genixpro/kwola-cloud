import math, random

import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim
import torch.autograd as autograd
import torch.nn.functional as F
import scipy.signal
import pandas
from torchvision import models

class BradNet(nn.Module):
    def __init__(self, additionalFeatureSize, numActions, executionTracePredictorSize, executionFeaturePredictorSize, cursorCount, whichGpu):
        super(BradNet, self).__init__()

        self.branchStampEdgeSize = 10

        self.whichGpu = whichGpu

        self.stampProjection = nn.Linear(additionalFeatureSize, self.branchStampEdgeSize*self.branchStampEdgeSize)
        self.stampProjectionParallel = nn.DataParallel(self.stampProjection)

        self.pixelFeatureCount = 32

        self.innerSize = 64

        self.peakInnerSize = 128

        self.mainModel = nn.Sequential(
            nn.Conv2d(3, self.innerSize, kernel_size=3, stride=2, dilation=1, padding=1),
            nn.ReLU(),
            nn.BatchNorm2d(self.innerSize),

            nn.Conv2d(self.innerSize, self.innerSize, kernel_size=3, stride=2, dilation=1, padding=1),
            nn.ReLU(),
            nn.BatchNorm2d(self.innerSize),

            nn.Conv2d(self.innerSize, self.peakInnerSize, kernel_size=3, stride=2, dilation=1, padding=1),
            nn.ReLU(),
            nn.BatchNorm2d(self.peakInnerSize),

            nn.Conv2d(self.peakInnerSize, self.innerSize, kernel_size=5, stride=1, dilation=3, padding=6),
            nn.ReLU(),
            nn.BatchNorm2d(self.innerSize),

            nn.Conv2d(self.innerSize, self.pixelFeatureCount, kernel_size=5, stride=1, dilation=1, padding=2),
            nn.ReLU(),
            nn.BatchNorm2d(self.pixelFeatureCount),

            torch.nn.Upsample(scale_factor=8)
        )
        self.mainModelParallel = nn.DataParallel(self.mainModel)

        self.presentRewardConvolution = nn.Conv2d(self.pixelFeatureCount, numActions, kernel_size=1, stride=1, padding=0, bias=False)
        self.presentRewardConvolutionParallel = nn.DataParallel(self.presentRewardConvolution)

        self.discountedFutureRewardConvolution = nn.Conv2d(self.pixelFeatureCount, numActions, kernel_size=1, stride=1, padding=0, bias=False)
        self.discountedFutureRewardConvolutionParallel = nn.DataParallel(self.discountedFutureRewardConvolution)

        self.predictedExecutionTraceLinear = nn.Sequential(
            nn.Linear(self.pixelFeatureCount, executionTracePredictorSize),
            nn.Sigmoid()
        )
        self.predictedExecutionTraceLinearParallel = nn.DataParallel(self.predictedExecutionTraceLinear)

        self.predictedExecutionFeaturesLinear = nn.Sequential(
            nn.Linear(self.pixelFeatureCount, executionFeaturePredictorSize),
            nn.Sigmoid()
        )
        self.predictedExecutionFeaturesLinearParallel = nn.DataParallel(self.predictedExecutionFeaturesLinear)

        self.predictedCursorLinear = nn.Sequential(
            nn.Linear(self.pixelFeatureCount, cursorCount),
            nn.Softmax()
        )
        self.predictedCursorLinearParallel = nn.DataParallel(self.predictedCursorLinear)

        self.numActions = numActions

    @property
    def stampProjectionCurrent(self):
        if self.whichGpu == "all":
            return self.stampProjectionParallel
        else:
            return self.stampProjection

    @property
    def mainModelCurrent(self):
        if self.whichGpu == "all":
            return self.mainModelParallel
        else:
            return self.mainModel

    @property
    def presentRewardConvolutionCurrent(self):
        if self.whichGpu == "all":
            return self.presentRewardConvolutionParallel
        else:
            return self.presentRewardConvolution


    @property
    def discountedFutureRewardConvolutionCurrent(self):
        if self.whichGpu == "all":
            return self.discountedFutureRewardConvolutionParallel
        else:
            return self.discountedFutureRewardConvolution


    @property
    def predictedExecutionTraceLinearCurrent(self):
        if self.whichGpu == "all":
            return self.predictedExecutionTraceLinearParallel
        else:
            return self.predictedExecutionTraceLinear

    @property
    def predictedExecutionFeaturesLinearCurrent(self):
        if self.whichGpu == "all":
            return self.predictedExecutionFeaturesLinearParallel
        else:
            return self.predictedExecutionFeaturesLinear


    @property
    def predictedCursorLinearCurrent(self):
        if self.whichGpu == "all":
            return self.predictedCursorLinearParallel
        else:
            return self.predictedCursorLinear


    def forward(self, data):
        width = data['image'].shape[3]
        height = data['image'].shape[2]

        stamp = self.stampProjectionCurrent(data['additionalFeature'])

        stampTiler = stamp.reshape([-1, self.branchStampEdgeSize, self.branchStampEdgeSize]).repeat([1, int(height / self.branchStampEdgeSize) + 1, int(width / self.branchStampEdgeSize) + 1])
        stampLayer = stampTiler[:, :height, :width].reshape([-1, 1, height, width])

        # Replace the saturation layer on the image with the stamp data layer
        merged = torch.cat([stampLayer, data['image']], dim=1)

        # print("Forward", merged.shape, flush=True)
        pixelFeatureMap = self.mainModelCurrent(merged)
        # print("Output", output.shape, flush=True)

        presentRewards = self.presentRewardConvolutionCurrent(pixelFeatureMap)
        discountFutureRewards = self.discountedFutureRewardConvolutionCurrent(pixelFeatureMap)
        totalReward = presentRewards + discountFutureRewards

        action_types = []
        action_xs = []
        action_ys = []
        if 'action_type' in data:
            action_types = data['action_type']
            action_xs = data['action_x']
            action_ys = data['action_y']
        else:
            action_indexes = totalReward.reshape([-1, width * height * self.numActions]).argmax(1).data

            for index in action_indexes:
                action_type, action_x, action_y = BradNet.actionIndexToActionDetails(width, height, self.numActions, index)

                action_types.append(action_type)
                action_xs.append(action_x)
                action_ys.append(action_y)

        forwardFeaturesForAuxillaryLosses = []
        for index, action_type, action_x, action_y in zip(range(len(action_types)), action_types, action_xs, action_ys):

            # temp fix
            action_x = min(action_x, width-1)
            action_y = min(action_y, height-1)

            featuresForAuxillaryLosses = pixelFeatureMap[index, :, int(action_y), int(action_x)].unsqueeze(0)
            forwardFeaturesForAuxillaryLosses.append(featuresForAuxillaryLosses)

        joinedFeatures = torch.cat(forwardFeaturesForAuxillaryLosses, dim=0)

        predictedTraces = self.predictedExecutionTraceLinearCurrent(joinedFeatures)
        predictedExecutionFeatures = self.predictedExecutionFeaturesLinearCurrent(joinedFeatures)
        predictedCursor = self.predictedCursorLinearCurrent(joinedFeatures)

        return presentRewards, discountFutureRewards, predictedTraces, predictedExecutionFeatures, predictedCursor, pixelFeatureMap


    def feature_size(self):
        return self.features(torch.zeros(1, *self.imageInputShape)).view(1, -1).size(1)


    @staticmethod
    def actionDetailsToActionIndex(width, height, numActions, action_type, action_x, action_y):
        return action_type * width * height \
               + action_y * width\
               + action_x


    @staticmethod
    def actionIndexToActionDetails(width, height, numActions, action_index):
        action_type = int(action_index / (width * height))

        index_within_type = int(action_index % (width * height))

        action_y = int(index_within_type / width)

        action_x = int(index_within_type % width)

        return action_type, action_x, action_y

