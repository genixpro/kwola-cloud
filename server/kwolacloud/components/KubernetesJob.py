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
    def __init__(self, module, data, referenceId, image, cpuRequest="1000m", memoryRequest="2.5Gi", cpuLimit="1500m", memoryLimit="3.0Gi"):
        self.module = module
        self.data = data
        self.referenceId = referenceId
        self.image = image
        self.cpuRequest = cpuRequest
        self.memoryRequest = memoryRequest
        self.cpuLimit = cpuLimit
        self.memoryLimit = memoryLimit
        # self.getKubernetesCredentials()

    def cleanup(self):
        subprocess.run(["kubectl", "delete", f"Job/{self.kubeJobName()}"])

    def getKubernetesCredentials(self):
        subprocess.run(["gcloud", "container", "clusters", "get-credentials", "testing-workers"])

    def kubeJobName(self):
        return f"kubernetes-job-{self.referenceId}"


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
                                "command": ["/usr/bin/python3"],
                                "args": ["-m", str(self.module), str(base64.b64encode(pickle.dumps(self.data), altchars=KubernetesJobProcess.base64AltChars), 'ascii')],
                                "securityContext": {
                                    "privileged": True,
                                    "capabilities":
                                        {
                                            "add": [
                                                "SYS_ADMIN"
                                            ]
                                        }
                                },
                                "volumeMounts": [
                                    {
                                        "mountPath": "/dev/shm",
                                        "name": "dshm"
                                    }
                                ],
                                "resources": {
                                    "requests": {
                                        "cpu": self.cpuRequest,
                                        "memory": self.memoryRequest
                                    },
                                    "limits": {
                                        "cpu": self.cpuLimit,
                                        "memory": self.memoryLimit
                                    }
                                }
                            }
                        ],
                        "restartPolicy": "OnFailure",
                        "volumes": [
                            {
                                "name": "dshm",
                                "emptyDir": {
                                    "medium": "Memory"
                                }
                            }
                        ]
                    }
                },
                "backoffLimit": 4
            }
        }

        yamlStr = yaml.dump(manifest)
        return yamlStr


    def start(self):
        yamlStr = self.generateJobSpec()

        process = subprocess.run(["kubectl", "apply", "-f", "-"], input=bytes(yamlStr, 'utf8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0:
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout}\n{process.stderr}")



    def getJobStatus(self):
        process = subprocess.run(["kubectl", "get", "-o", "json", "job", self.kubeJobName()], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0:
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout}\n{process.stderr}")

        jsonData = json.loads(process.stdout)

        if "active" in jsonData['status'] and jsonData['status']['active'] == 1:
            return "Running"

        status = jsonData["status"]["conditions"][0]["type"]

        return status

    def ready(self):
        status = self.getJobStatus()
        return status != "Running"

    def successful(self):
        status = self.getJobStatus()
        if status == "Running":
            raise ValueError("Can't ask if job is successful if it is still running")

        return status == "Success"

    def failed(self):
        status = self.getJobStatus()
        if status == "Running":
            raise ValueError("Can't ask if job is successful if it is still running")
        return status == "Failed"


    def wait(self):
        while not self.ready():
            time.sleep(10)

    def getLogs(self):
        process = subprocess.run(["kubectl", "logs", "--tail", "-1", f"Job/{self.kubeJobName()}"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0:
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout}\n{process.stderr}")

        return str(process.stdout, 'utf8')

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
