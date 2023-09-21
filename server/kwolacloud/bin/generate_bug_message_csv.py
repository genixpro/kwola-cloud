#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#


import traceback
import logging
from kwola.datamodels.BugModel import BugModel
from kwolacloud.helpers.initialize import initializeKwolaCloudProcess
from kwola.components.utils.regex import sharedNonJavascriptCodeUrlRegex, sharedHexUuidRegex, sharedMongoObjectIdRegex, sharedISO8601DateRegex, sharedStandardBase64Regex, sharedAlphaNumericalCodeRegex,sharedISO8601TimeRegex, sharedIPAddressRegex, sharedLongNumberRegex
import re
from pprint import pprint

# Do not remove the following unused imports, as they are actually required
# For the migration script to function correctly.
from kwola.datamodels.actions.BaseAction import BaseAction
from kwola.datamodels.actions.ClearFieldAction import ClearFieldAction
from kwola.datamodels.actions.ClickTapAction import ClickTapAction
from kwola.datamodels.actions.RightClickAction import RightClickAction
from kwola.datamodels.actions.ScrollingAction import ScrollingAction
from kwola.datamodels.actions.TypeAction import TypeAction
from kwola.datamodels.actions.WaitAction import WaitAction
from kwola.datamodels.errors.BaseError import BaseError
from kwola.datamodels.errors.ExceptionError import ExceptionError
from kwola.datamodels.errors.HttpError import HttpError
from kwola.datamodels.errors.LogError import LogError
from kwola.datamodels.errors.DotNetRPCError import DotNetRPCError
from kwolacloud.components.plugins.CreateCloudBugObjects import CreateCloudBugObjects

def main():
    try:
        initializeKwolaCloudProcess()

        allMessages = set()

        sampleValues = {
            'URL': set(),
            'UUID': set(),
            'MONGO': set(),
            'DATE': set(),
            'TIME': set(),
            'IP': set(),
            'NUM': set(),
            'BASE64': set(),
            'CODE': set()
        }

        regexes = [
            (sharedNonJavascriptCodeUrlRegex, 'URL'),
            (sharedHexUuidRegex, 'UUID'),
            (sharedMongoObjectIdRegex, 'MONGO'),
            (sharedISO8601DateRegex, 'DATE'),
            (sharedISO8601TimeRegex, 'TIME'),
            (sharedIPAddressRegex, 'IP'),
            (sharedLongNumberRegex, 'NUM'),
            (sharedStandardBase64Regex, 'BASE64'),
            (sharedAlphaNumericalCodeRegex, 'CODE')
        ]

        def outputMessages():
            nonlocal allMessages
            filteredAllMessages = []
            for message in allMessages:
                for regex, name in regexes:
                    message = re.sub(regex, f"[{name}]", message)
                filteredAllMessages.append(message)

            filteredAllMessages = sorted(filteredAllMessages, key=lambda m: re.sub(r"\d", "", m))

            fileName = f"messages.csv"
            with open(fileName, 'wt') as f:
                logging.info(f"Writing out {fileName}")
                for message in filteredAllMessages:
                    f.write(message + "\n")

        completedBugs = 0

        for bug in BugModel.objects().only('id', 'error'):
            message = bug.error.message.replace("\n", " ")

            matchMessage = message
            for regex, name in regexes:
                match = re.search(regex, matchMessage)
                if match is not None:
                    sampleValues[name].add(match.group(0))
                matchMessage = re.sub(regex, f"[{name}]", matchMessage)

            if message not in allMessages:
                found = False
                for existingMessage in allMessages:
                    similarityScore = BaseError.computeErrorMessageSimilarity(str(message), str(existingMessage))
                    if similarityScore > 0.90:
                        found = True
                        break
                if not found:
                    allMessages.add(message)

            completedBugs += 1
            if completedBugs % 5000 == 0:
                outputMessages()

        outputMessages()

        for name, values in sampleValues.items():
            fileName = f"{name.lower()}.csv"
            logging.info(f"Writing out {fileName}")
            with open(fileName, 'wt') as f:
                for sample in sorted(list(values)):
                    f.write(sample + "\n")


    except Exception as e:
        logging.info(f"Received an error while running the migration task: {traceback.format_exc()}")

if __name__ == "__main__":
    main()