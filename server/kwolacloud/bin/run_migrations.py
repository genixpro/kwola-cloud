#
#     This file is copyright 2023 Bradley Allen Arsenault & Genixpro Technologies Corporation
#     See license file in the root of the project for terms & conditions.
#

from .migrate_bug_objects import main as migrate_bug_objects_main
from .migrate_bug_object_severity_score import main as migrate_bug_severity_score
from .migrate_bug_object_canonical_url import main as migrate_bug_canonical_url
from .migrate_execution_session_change_detection_flag import main as migrate_execution_sessions



def main():
    # migrate_bug_severity_score()
    # migrate_bug_objects_main()
    # migrate_bug_canonical_url()
    migrate_execution_sessions()
    pass
