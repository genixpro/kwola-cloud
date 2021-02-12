#
#     Kwola is an AI algorithm that learns how to use other programs
#     automatically so that it can find bugs in them.
#
#     Copyright (C) 2020 Kwola Software Testing Inc.
#
#     This program is free software: you can redistribute it and/or modify
#     it under the terms of the GNU Affero General Public License as
#     published by the Free Software Foundation, either version 3 of the
#     License, or (at your option) any later version.
#
#     This program is distributed in the hope that it will be useful,
#     but WITHOUT ANY WARRANTY; without even the implied warranty of
#     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#     GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with this program.  If not, see <https://www.gnu.org/licenses/>.
#


from ..config.config import KwolaCoreConfiguration
from ..tasks import TrainAgentLoop
from ..diagnostics.test_installation import testInstallation
import os.path
import questionary
import sys
from ..config.logger import getLogger, setupLocalLogging
import logging


def main():
    """
        This is the entry point for the main Kwola application, the console command "kwola".
        All it does is start a training loop.
    """
    setupLocalLogging()
    success = testInstallation(verbose=True)
    if not success:
        print(
            "Unable to start the training loop. There appears to be a problem "
            "with your Kwola installation or environment. Exiting.")
        exit(1)

    configDir = KwolaCoreConfiguration.createNewLocalKwolaConfigDir("standard_experiment",
                                                                    url="http://kros3.kwola.io/",
                                                                    batch_size=64,
                                                                    batches_per_iteration=2,
                                                                    testing_sequence_length=100,
                                                                    iterations_per_training_step=250,
                                                                    testing_sequences_in_parallel_per_training_loop=5,
                                                                    testing_sequences_per_training_loop=5,
                                                                    web_session_parallel_execution_sessions=12,
                                                                    web_session_no_network_activity_wait_time=0.0,
                                                                    web_session_perform_action_wait_time=0.1,
                                                                    email=None,
                                                                    password=None,
                                                                    name=None,
                                                                    paragraph=None,
                                                                    enableTypeEmail=None,
                                                                    enableTypePassword=None,
                                                                    enableRandomNumberCommand=True,
                                                                    enableRandomBracketCommand=False,
                                                                    enableRandomMathCommand=False,
                                                                    enableRandomOtherSymbolCommand=False,
                                                                    enableDoubleClickCommand=False,
                                                                    enableRightClickCommand=False,
                                                                    enableRandomLettersCommand=False,
                                                                    enableRandomAddressCommand=False,
                                                                    enableRandomEmailCommand=True,
                                                                    enableRandomPhoneNumberCommand=False,
                                                                    enableRandomParagraphCommand=False,
                                                                    enableRandomDateTimeCommand=False,
                                                                    enableRandomCreditCardCommand=False,
                                                                    enableRandomURLCommand=False,
                                                                    enableScrolling=True,
                                                                    autologin=False,
                                                                    prevent_offsite_links=True,
                                                                    web_session_enable_chrome=True,
                                                                    web_session_enable_firefox=False,
                                                                    web_session_enable_edge=False,
                                                                    web_session_enable_window_size_desktop=True,
                                                                    web_session_enable_window_size_tablet=False,
                                                                    web_session_enable_window_size_mobile=False,
                                                                    custom_typing_action_strings=["test1", "test2", "test3", "test4"]
                                                                    )

    getLogger().info(f"New Kros3 experiment configuration created in directory {configDir}")
