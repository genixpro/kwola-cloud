from kwola.datamodels.ApplicationModel import ApplicationModel
from kwola.datamodels.TrainingSequenceModel import TrainingSequence
from kwola.datamodels.TestingSequenceModel import TestingSequenceModel
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwola.datamodels.ExecutionTraceModel import ExecutionTrace
from kwola.datamodels.TrainingStepModel import TrainingStep
from mongoengine import connect

connect('kwola')

def main():
    ApplicationModel.objects().delete()
    TrainingSequence.objects().delete()
    TestingSequenceModel.objects().delete()
    ExecutionSession.objects().delete()
    ExecutionTrace.objects().delete()
    TrainingStep.objects().delete()

    print("Kwola Mongo database is now cleared")
