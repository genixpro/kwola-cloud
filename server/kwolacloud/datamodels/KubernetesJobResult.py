#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#


from mongoengine import *
from kwola.datamodels.CustomIDField import CustomIDField
from kwola.datamodels.errors.BaseError import BaseError



class KubernetesJobResult(Document):
    id = CustomIDField()

    result = DynamicField()

