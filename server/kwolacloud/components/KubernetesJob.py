import yaml
import os
import subprocess
import logging
import json
import pickle
import time
import base64
from .KubernetesJobProcess import KubernetesJobProcess

class KubernetesJob:
    def __init__(self, module, data, referenceId, image):
        self.module = module
        self.data = data
        self.referenceId = referenceId
        self.image = image

    def __del__(self):
        subprocess.run(["kubectl", "delete", f"Job/{self.kubeJobName()}"])

    def kubeJobName(self):
        return f"testing_job_{self.referenceId}"


    def generateJobSpec(self):
        manifest = {
            "apiVersion": "batch/v1",
            "kind": "Job",
            "metadata": {
                "name": self.kubeJobName()
            },
            "spec": {
                "template": {
                    "metadata": {
                        "name": self.kubeJobName()
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": f"kwola-cloud-sha256",
                                "image": f"gcr.io/kwola-cloud/kwola:{os.getenv('REVISION_ID')}-{os.getenv('KWOLA_ENV')}-testingworker",
                                "command": ["python3"],
                                "args": ["-m", self.module, base64.b64encode(pickle.dumps(self.data), altchars=KubernetesJobProcess.base64AltChars)]
                            }
                        ],
                        "restartPolicy": "Never"
                    }
                },
                "backoffLimit": 4
            }
        }

        yamlStr = yaml.dump(manifest)
        return yamlStr


    def start(self):
        yamlStr = self.generateJobSpec()
        logging.info(yamlStr)

        process = subprocess.run(["kubectl", "apply", "-f", "-"], input=yamlStr)
        if process.returncode != 0:
            logging.error(f"Error! Did not exit succesfully: \n{process.stdout}\n{process.stderr}")



    def getJobStatus(self):
        process = subprocess.run(["kubectl", "get", "-o", "json", "job", self.kubeJobName()])
        if process.returncode != 0:
            logging.error(f"Error! Did not exit succesfully: \n{process.stdout}\n{process.stderr}")

        logging.info(process.stdout)

        jsonData = json.loads(process.stdout)

        status = jsonData["status"]["conditions"][0]["type"]

        return status

    def ready(self):
        status = self.getJobStatus()
        print(status)
        return status != "Running"

    def successful(self):
        status = self.getJobStatus()
        if status == "Running":
            raise ValueError("Can't ask if job is successful if it is still running")

        return status == "Completed"

    def failed(self):
        status = self.getJobStatus()
        if status == "Running":
            raise ValueError("Can't ask if job is successful if it is still running")
        return status == "Failed"


    def wait(self):
        while not self.ready():
            time.sleep(10)

    def getLogs(self):
        process = subprocess.run(["kubectl", "logs", "--tail", "-1", f"Job/{self.kubeJobName()}"])
        if process.returncode != 0:
            logging.error(f"Error! Did not exit successfully: \n{process.stdout}\n{process.stderr}")

        logging.info(process.stdout)

        jsonData = json.loads(process.stdout)

        status = jsonData["status"]["conditions"][0]["type"]

        return status

    def extractResultFromLogs(self):
        logs = self.getLogs()
        if KubernetesJobProcess.resultStartString not in logs or KubernetesJobProcess.resultFinishString not in logs:
            logging.error(f"[{os.getpid()}] Error! Unable to extract result from the subprocess. Its possible the subprocess may have died")
            return None
        else:
            resultStart = logs.index(KubernetesJobProcess.resultStartString)
            resultFinish = logs.index(KubernetesJobProcess.resultFinishString)

            resultDataString = logs[resultStart + len(KubernetesJobProcess.resultStartString) : resultFinish]
            result = pickle.loads(base64.b64decode(resultDataString, altchars=KubernetesJobProcess.base64AltChars))
            return result