import yaml
import os
import subprocess
import logging
import json
import time
from kwola.tasks.TaskProcess import TaskProcess

class KubernetesJob:
    def __init__(self, command, referenceId, image):
        self.command = command
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
                                "command": [self.command[0]],
                                "args": [str(v) for v in self.command[1:]]
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


    def startJob(self):
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
        if TaskProcess.resultStartString not in logs or TaskProcess.resultFinishString not in logs:
            logging.error(f"[{os.getpid()}] Error! Unable to extract result from the subprocess. Its possible the subprocess may have died")
            return None
        else:
            resultStart = logs.index(TaskProcess.resultStartString)
            resultFinish = logs.index(TaskProcess.resultFinishString)

            resultDataString = logs[resultStart + len(TaskProcess.resultStartString) : resultFinish]
            result = json.loads(resultDataString)
            return result
