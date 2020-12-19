from ...components.utils.regex import sharedNonJavascriptCodeUrlRegex, sharedHexUuidRegex, sharedMongoObjectIdRegex, sharedISO8601DateRegex, sharedStandardBase64Regex, sharedAlphaNumericalCodeRegex, sharedISO8601TimeRegex, sharedIPAddressRegex, sharedLongNumberRegex
import re


def deuniqueString(string, addSubstituteReferences=False, deuniqueMode="error"):
    if isinstance(string, bytes):
        try:
            string = str(string, 'utf8')
        except UnicodeDecodeError:
            string = str(string)

    deduplicationIgnoreRegexes = []

    validDeuniqueModes = ['error', 'url']
    if deuniqueMode not in validDeuniqueModes:
        raise ValueError(f"deuniqueMode must be one of {validDeuniqueModes}")

    if deuniqueMode == 'error':
        deduplicationIgnoreRegexes.extend([
            (sharedNonJavascriptCodeUrlRegex, 'URL')
        ])

    deduplicationIgnoreRegexes.extend([
        (sharedHexUuidRegex, 'HEXID'),
        (sharedMongoObjectIdRegex, 'MONGOID'),
        (sharedISO8601DateRegex, 'DATE'),
        (sharedISO8601TimeRegex, 'TIME'),
        (sharedIPAddressRegex, 'IP'),
        (sharedLongNumberRegex, 'LONG'),
        (sharedStandardBase64Regex, 'BASE64'),
        (sharedAlphaNumericalCodeRegex, 'ALPHANUMCODE')
    ])

    for regex, name in deduplicationIgnoreRegexes:
        substitution = ""
        if addSubstituteReferences:
            substitution = "[<" + name + ">]"

        string = re.sub(regex, substitution, string)

    return str(string.encode('ascii', 'xmlcharrefreplace'), 'ascii')



