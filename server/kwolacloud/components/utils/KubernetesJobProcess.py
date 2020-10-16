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

import logging
import json
from datetime import datetime
import pickle
import base64
import sys
import os
import psutil
import time
import google.cloud.logging
from kwolacloud.config.config import loadConfiguration
import stripe
from kwola.config.logger import getLogger
from kwolacloud.db import connectToMongoWithRetries
from ...helpers.slack import SlackLogHandler
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess
from kwolacloud.datamodels.KubernetesJobResult import KubernetesJobResult
from .KubernetesJob import KubernetesJob

class KubernetesJobProcess:
    """
        This class represents a task subprocess. This has the code that runs inside the sub-process which communicates
        upwards to the manager. See ManagedTaskSubprocess.
    """

    def __init__(self, targetFunc):
        self.targetFunc = targetFunc

        initializeKwolaCloudProcess()

    def run(self):
        logging.info(f"[{os.getpid()}] KubernetesJobProcess: Waiting for input from stdin")
        dataStr = sys.argv[1]
        module, referenceId, data = pickle.loads(base64.b64decode(dataStr, altchars=KubernetesJob.base64AltChars))
        logging.info(f"[{os.getpid()}] Running process with following data:\n{json.dumps(data, indent=4)}")
        result = self.targetFunc(**data)
        logging.info(f"Process finished with result:\n{json.dumps(result, indent=4)}")

        job = KubernetesJob(module=module,
                            data=data,
                            referenceId=referenceId)
    
        resultObj = KubernetesJobResult(
            id=job.kubeJobName(),
            result=result,
            time=datetime.now()
        )
        resultObj.save()

        job.recordJobLogs()

        p = psutil.Process(os.getpid())
        for child in p.children(recursive=True):
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
        time.sleep(1)
        for child in p.children(recursive=True):
            try:
                child.kill()
            except psutil.NoSuchProcess:
                pass

        exit(0)
