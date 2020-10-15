#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField



class KubernetesJobLogs(Document):
    id = CustomIDField()

    logs = StringField()

    time = DateTimeField()
