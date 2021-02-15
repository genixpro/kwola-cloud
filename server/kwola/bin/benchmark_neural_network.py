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



from ..config.config import KwolaCoreConfiguration
from ..components.agents.DeepLearningAgent import DeepLearningAgent
import torch
import torch.distributed
import traceback
import sys
import tempfile
import os
import shutil
from datetime import datetime
import torch.autograd.profiler as profiler

from ..config.config import KwolaCoreConfiguration
from ..datamodels.CustomIDField import CustomIDField
from ..datamodels.TestingStepModel import TestingStep
from ..tasks import RunTestingStep
from .main import getConfigurationDirFromCommandLineArgs
from ..diagnostics.test_installation import testInstallation
from ..config.logger import getLogger, setupLocalLogging
import logging

def main():
    """
        This is the entry point for the Kwola secondary command, kwola_run_test_step.
    """
    try:
        configDir = KwolaCoreConfiguration.createNewLocalKwolaConfigDir("standard_experiment",
                                                                        url="http://demo.kwolatesting.com/",
                                                                        email="",
                                                                        password="",
                                                                        name="",
                                                                        paragraph="",
                                                                        enableTypeEmail=True,
                                                                        enableTypePassword=True,
                                                                        enableRandomNumberCommand=False,
                                                                        enableRandomBracketCommand=False,
                                                                        enableRandomMathCommand=False,
                                                                        enableRandomOtherSymbolCommand=False,
                                                                        enableDoubleClickCommand=False,
                                                                        enableRightClickCommand=False
                                                                        )

        config = KwolaCoreConfiguration.loadConfigurationFromDirectory(configDir)

        init_method = f"file://{os.path.join(tempfile.gettempdir(), 'kwola_distributed_coordinator')}"

        if sys.platform == "win32" or sys.platform == "win64":
            init_method = f"file:///{os.path.join(tempfile.gettempdir(), 'kwola_distributed_coordinator')}"

        torch.distributed.init_process_group(backend="gloo",
                                             world_size=1,
                                             rank=0,
                                             init_method=init_method)

        agent = DeepLearningAgent(config=config, whichGpu=0)

        agent.initialize(enableTraining=True)

        agent.save()
        agent.load()
        batches = [agent.prepareEmptyBatch()] * config['neural_network_batches_per_iteration']

        start = datetime.now()

        with profiler.profile(with_stack=True, record_shapes=False, use_cuda=True) as prof:
            for batch in batches:
                agent.learnFromBatches([batch], trainingStepIndex=100)

        print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=100))

        end = datetime.now()

        timePerSample = (end - start).total_seconds() / (len(batches) * config['neural_network_batch_size'])

        print(f"Average time per sample: f{timePerSample:.4}")

        return True
    except Exception:
        traceback.print_exc()
        return False
    finally:
        shutil.rmtree(configDir)