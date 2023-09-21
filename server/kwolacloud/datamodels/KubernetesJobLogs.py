#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField



class KubernetesJobLogs(Document):
    id = CustomIDField()

    logs = StringField()

    time = DateTimeField()
