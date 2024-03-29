#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from kwola.bin.main import getConfigurationDirFromCommandLineArgs
from kwola.components.environments.WebEnvironment import WebEnvironment
from kwola.config.config import KwolaCoreConfiguration
from kwola.diagnostics.test_installation import testInstallation
import time
from kwola.config.logger import getLogger, setupLocalLogging
import logging
from kwola.datamodels.ExecutionSessionModel import ExecutionSession
from kwolacloud.components.core.BehaviouralChangeDetector import BehaviourChangeDetector
import cProfile
import pstats

def main():
    setupLocalLogging()
    success = testInstallation(verbose=True)
    if not success:
        print(
            "Unable to start the training loop. There appears to be a problem "
            "with your Kwola installation or environment. Exiting.")
        exit(1)

    configDir = getConfigurationDirFromCommandLineArgs()
    config = KwolaCoreConfiguration.loadConfigurationFromDirectory(configDir)

    regressionTester = BehaviourChangeDetector(config)

    executionSessionFiles = config.listAllFilesInFolder("execution_sessions")

    # profile = cProfile.Profile()
    for fileName in executionSessionFiles:
        sessionId = fileName.replace(".json", "").replace(".gz", "").replace(".pickle", "")

        executionSession = ExecutionSession.loadFromDisk(sessionId, config)

        # profile.enable()

        seenDifferenceHashes = set()

        differences = regressionTester.findAllChangesForExecutionSession(executionSession, seenDifferenceHashes, None)
        #
        # profile.disable()
        #
        # stats = pstats.Stats(profile).sort_stats("cumtime")
        # stats.print_stats()
        # stats.print_callers()


