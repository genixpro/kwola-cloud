#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.errors.BaseError import BaseError



class KubernetesJobResult(Document):
    id = CustomIDField()

    result = DynamicField()

    time = DateTimeField()
