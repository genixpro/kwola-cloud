from ...components.utils.regex import sharedNonJavascriptCodeUrlRegex, sharedHexUuidRegex, sharedMongoObjectIdRegex, sharedISO8601DateRegex, sharedStandardBase64Regex, sharedAlphaNumericalCodeRegex, sharedISO8601TimeRegex, sharedIPAddressRegex, sharedLongNumberRegex
import re


def deuniqueString(string):
    if isinstance(string, bytes):
        try:
            string = str(string, 'utf8')
        except UnicodeDecodeError:
            string = str(string)

    deduplicationIgnoreRegexes = [
        sharedNonJavascriptCodeUrlRegex,
        sharedHexUuidRegex,
        sharedMongoObjectIdRegex,
        sharedISO8601DateRegex,
        sharedISO8601TimeRegex,
        sharedIPAddressRegex,
        sharedLongNumberRegex,
        sharedStandardBase64Regex,
        sharedAlphaNumericalCodeRegex
    ]

    for regex in deduplicationIgnoreRegexes:
        string = re.sub(regex, "", string)

    return str(string.encode('ascii', 'xmlcharrefreplace'), 'ascii')



