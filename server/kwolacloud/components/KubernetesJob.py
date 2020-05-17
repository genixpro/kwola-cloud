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

    def cleanup(self):
        self.refreshCredentials()
        subprocess.run(["kubectl", "delete", f"Job/{self.kubeJobName()}"])

    def refreshCredentials(self):
        subprocess.run(["gcloud", "auth", "activate-service-account", "kwola-288@kwola-cloud.iam.gserviceaccount.com", f"--key-file={os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}"])
        subprocess.run(["gcloud", "container", "clusters", "get-credentials", "testing-workers"])
        subprocess.run(["kubectl", "cluster-info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def kubeJobName(self):
        return f"kubernetes-job-{self.referenceId}"


    def generateJobSpec(self):
        requests = {}
        limits = {}

        if self.cpuLimit is not None:
            limits["cpu"] = self.cpuLimit

        if self.memoryLimit is not None:
            limits["memory"] = self.memoryLimit

        if self.cpuRequest is not None:
            requests["cpu"] = self.cpuRequest

        if self.memoryRequest is not None:
            requests["memory"] = self.memoryRequest

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
                                    "requests": requests,
                                    "limits": limits
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
        self.refreshCredentials()

        yamlStr = self.generateJobSpec()

        process = subprocess.run(["kubectl", "apply", "-f", "-"], input=bytes(yamlStr, 'utf8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0 and (len(process.stdout) or len(process.stderr)):
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout}\n{process.stderr}")



    def getJobStatus(self):
        self.refreshCredentials()

        process = subprocess.run(["kubectl", "get", "-o", "json", "job", self.kubeJobName()], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0 and (len(process.stdout) or len(process.stderr)):
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout}\n{process.stderr}")

        jsonData = json.loads(process.stdout)

        if "active" in jsonData['status'] and jsonData['status']['active'] == 1:
            return "Running"

        if "failed" in jsonData['status'] and jsonData['status']['failed'] == 1:
            return "Failed"

        if "succeeded" in jsonData['status'] and jsonData['status']['succeeded'] == 1:
            return "Success"

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
        self.refreshCredentials()

        process = subprocess.run(["kubectl", "logs", "--tail", "-1", f"Job/{self.kubeJobName()}"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0 and (len(process.stdout) or len(process.stderr)):
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
