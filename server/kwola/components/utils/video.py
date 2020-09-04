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



from ...components.agents.DeepLearningAgent import DeepLearningAgent
from ...config.config import Configuration
from ...config.logger import getLogger, setupLocalLogging
from ...datamodels.ExecutionSessionModel import ExecutionSession
import os
import subprocess


def getAvailableFfmpegCodecs():
    result = subprocess.run(['ffmpeg', '-encoders'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = str(result.stdout, 'utf8')
    encoderString = "Encoders:"
    output = output[output.find(encoderString) + len(encoderString):]
    encoderString = "------"
    output = output[output.find(encoderString) + len(encoderString):]

    codecs = [line.strip().split()[1] for line in output.splitlines() if len(line.strip().split()) > 1]

    return codecs


def chooseBestFfmpegVideoCodec():
    availableVideoCodecs = getAvailableFfmpegCodecs()

    codecPriorityList = [
        'x264',
        "libx264",
        'mpeg4',
        'libwebp',
        'libtheora',
        'libvpx',
        'mjpeg',
        'gif',
    ]

    codec = ''
    for possibleCodec in codecPriorityList:
        if possibleCodec in availableVideoCodecs:
            codec = possibleCodec
            break
    return codec


def createDebugVideoSubProcess(configDir, executionSessionId, name="", includeNeuralNetworkCharts=True, includeNetPresentRewardChart=True, hilightStepNumber=None, cutoffStepNumber=None, folder="debug_videos"):
    setupLocalLogging()

    getLogger().info(f"Creating debug video for session {executionSessionId} with options includeNeuralNetworkCharts={includeNeuralNetworkCharts}, includeNetPresentRewardChart={includeNetPresentRewardChart}, hilightStepNumber={hilightStepNumber}, cutoffStepNumber={cutoffStepNumber}")

    config = Configuration(configDir)

    agent = DeepLearningAgent(config, whichGpu=None)
    agent.initialize(enableTraining=False)
    agent.load()

    kwolaDebugVideoDirectory = config.getKwolaUserDataDirectory(folder)

    executionSession = ExecutionSession.loadFromDisk(executionSessionId, config)

    videoData = agent.createDebugVideoForExecutionSession(executionSession, includeNeuralNetworkCharts=includeNeuralNetworkCharts, includeNetPresentRewardChart=includeNetPresentRewardChart, hilightStepNumber=hilightStepNumber, cutoffStepNumber=cutoffStepNumber)
    with open(os.path.join(kwolaDebugVideoDirectory, f'{name + "_" if name else ""}{str(executionSession.id)}.mp4'), "wb") as cloneFile:
        cloneFile.write(videoData)

    del agent
