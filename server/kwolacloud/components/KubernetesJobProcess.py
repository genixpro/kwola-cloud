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
import google.cloud.logging
from ..config.config import loadConfiguration
from mongoengine import connect
import stripe

class KubernetesJobProcess:
    """
        This class represents a task subprocess. This has the code that runs inside the sub-process which communicates
        upwards to the manager. See ManagedTaskSubprocess.
    """

    resultStartString = "======== TASK PROCESS RESULT START ========"
    resultFinishString = "======== TASK PROCESS RESULT END ========"
    base64AltChars = b"-_"

    def __init__(self, targetFunc):
        self.targetFunc = targetFunc

        configData = loadConfiguration()

        # Setup logging with google cloud
        client = google.cloud.logging.Client()
        client.get_default_handler()
        client.setup_logging()

        connect(configData['mongo']['db'], host=configData['mongo']['uri'])

        stripe.api_key = configData['stripe']['apiKey']

    def run(self):
        logging.info(f"[{os.getpid()}] KubernetesJobProcess: Waiting for input from stdin")
        dataStr = sys.argv[1]
        data = pickle.loads(base64.b64decode(dataStr, altchars=KubernetesJobProcess.base64AltChars))
        logging.info(f"[{os.getpid()}] Running process with following data:\n{json.dumps(data, indent=4)}")
        result = self.targetFunc(**data)
        print(KubernetesJobProcess.resultStartString, flush=True)
        print(base64.b64encode(pickle.dumps(result), altchars=KubernetesJobProcess.base64AltChars), flush=True)
        print(KubernetesJobProcess.resultFinishString, flush=True)
        exit(0)
