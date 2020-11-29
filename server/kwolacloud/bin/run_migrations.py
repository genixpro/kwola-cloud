#
#     This file is copyright 2020 Kwola Software Testing Inc.
#     All Rights Reserved.
#

from .migrate_bug_objects import main as migrate_bug_objects_main
from .migrate_bug_object_severity_score import main as migrate_bug_severity_score



def main():
    migrate_bug_objects_main()
    migrate_bug_severity_score()
