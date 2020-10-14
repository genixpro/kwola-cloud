import yaml
import os
import subprocess
import json
import pickle
import time
import logging
import base64
import datetime
from kwolacloud.components.utils.KubernetesJobProcess import KubernetesJobProcess
from kwola.components.utils.retry import autoretry
from kwolacloud.datamodels.KubernetesJobResult import KubernetesJobResult

class KubernetesJob:
    statusRefreshTime = 30

    def __init__(self, module, data, referenceId, image="worker", cpuRequest="1000m", memoryRequest="2.5Gi", cpuLimit="1500m", memoryLimit="3.0Gi", gpu=False):
        self.module = module
        self.data = data
        self.referenceId = referenceId
        self.image = image
        self.cpuRequest = cpuRequest
        self.memoryRequest = memoryRequest
        self.cpuLimit = cpuLimit
        self.memoryLimit = memoryLimit
        self.gpu = gpu
        self.maxKubectlRetries = 10
        self.result = None
        self.lastStatus = None
        self.lastStatusTime = None

    @autoretry(onFailure=lambda self: self.refreshCredentials(), ignoreFailure=True)
    def cleanup(self):
        process = subprocess.run(["kubectl", "delete", f"Job/{self.kubeJobName()}"])
        if process.returncode != 0 and (len(process.stdout) or len(process.stderr)):
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout if process.stdout else 'no data on stdout'}\n{process.stderr if process.stderr else 'no data on stderr'}")

    def refreshCredentials(self):
        subprocess.run(["gcloud", "auth", "activate-service-account", "kwola-288@kwola-cloud.iam.gserviceaccount.com", f"--key-file={os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["gcloud", "container", "clusters", "get-credentials", "testing-workers"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # subprocess.run(["kubectl", "cluster-info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def kubeJobName(self):
        return f"kubernetes-job-{self.referenceId.replace('_', '-')}"


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

        if self.gpu:
            requests["nvidia.com/gpu"] = 1
            limits["nvidia.com/gpu"] = 1

        manifest = {
            "apiVersion": "batch/v1",
            "kind": "Job",
            "metadata": {
                "name": self.kubeJobName()
            },
            "spec": {
                "ttlSecondsAfterFinished": 7200,
                "template": {
                    "metadata": {
                        "name": self.kubeJobName()
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": f"kwola-cloud-sha256",
                                "image": f"gcr.io/kwola-cloud/kwola-{self.image}-{os.getenv('KWOLA_ENV')}:latest",
                                "command": ["/usr/bin/python3"],
                                "args": ["-m", str(self.module), str(base64.b64encode(pickle.dumps((self.kubeJobName(), self.data)), altchars=KubernetesJobProcess.base64AltChars), 'utf8')],
                                "imagePullPolicy": "Always",
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
                "backoffLimit": 5
            }
        }

        yamlStr = yaml.dump(manifest)
        return yamlStr


    @autoretry(onFailure=lambda self: self.refreshCredentials())
    def start(self):
        yamlStr = self.generateJobSpec()

        process = subprocess.run(["kubectl", "apply", "-f", "-"], input=bytes(yamlStr, 'utf8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode != 0 and (len(process.stdout) or len(process.stderr)):
            raise RuntimeError(f"Error! kubectl did not exit successfully: \n{process.stdout if process.stdout else 'no data on stdout'}\n{process.stderr if process.stderr else 'no data on stderr'}")

        return


    @autoretry(onFailure=lambda self: self.refreshCredentials())
    def getJobStatus(self):
        if self.lastStatus is not None and (datetime.datetime.now() - self.lastStatusTime).total_seconds() > KubernetesJob.statusRefreshTime:
            return self.lastStatus

        process = subprocess.run(["kubectl", "get", "-o", "json", "job", self.kubeJobName()], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode == 1 and (b"NotFound" in process.stderr):
            self.lastStatus = "Failed"
            self.lastStatusTime = datetime.datetime.now()
            return self.lastStatus
        elif process.returncode != 0 and (len(process.stdout) or len(process.stderr)):
            raise RuntimeError(
                f"Error! kubectl did not exit successfully: \n{process.stdout if process.stdout else 'no data on stdout'}\n{process.stderr if process.stderr else 'no data on stderr'}")

        try:
            jsonData = json.loads(process.stdout)
        except json.JSONDecodeError:
            logging.error(f"Error decoding json {process.stdout}")
            raise

        if "active" in jsonData['status'] and jsonData['status']['active'] >= 1:
            self.lastStatus = "Running"
            self.lastStatusTime = datetime.datetime.now()
            return self.lastStatus

        if "succeeded" in jsonData['status'] and jsonData['status']['succeeded'] >= 1:
            self.lastStatus = "Success"
            self.lastStatusTime = datetime.datetime.now()
            return self.lastStatus

        if "failed" in jsonData['status'] and jsonData['status']['failed'] >= 1:
            self.lastStatus = "Failed"
            self.lastStatusTime = datetime.datetime.now()
            return self.lastStatus

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

    @autoretry(onFailure=lambda self: self.refreshCredentials())
    def doesJobStillExist(self):
        process = subprocess.run(["kubectl", "get", f"Job/{self.kubeJobName()}"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if process.returncode == 1 and (b"NotFound" in process.stderr):
            return False
        elif process.returncode == 0:
            return True
        else:
            raise RuntimeError(
                f"Error! kubectl did not exit successfully: \n{process.stdout if process.stdout else 'no data on stdout'}\n{process.stderr if process.stderr else 'no data on stderr'}")


    def getResult(self):
        if self.result is not None:
            return self.result.result

        self.result = KubernetesJobResult.objects(id=self.kubeJobName()).first()

        if self.result is not None:
            return self.result.result
        else:
            return None


