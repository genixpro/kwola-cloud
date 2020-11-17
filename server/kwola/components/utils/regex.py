import re

sharedUrlRegex = re.compile(
    r'(?:http|ftp)s?://'  # http:// or https://
    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
    r'localhost|'  # localhost...
    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
    r'(?::\d+)?'  # optional port
    r'(?:[/?]\S+|/?)', re.IGNORECASE)


sharedHexUuidRegex = re.compile(
    r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}',
    re.IGNORECASE)


sharedMongoObjectIdRegex = re.compile(
    r'5[a-f0-9]{23}',
    re.IGNORECASE)


sharedISO8601DateRegex = re.compile(
    r'20\d{2}-\d\d-\d\d(?:T\d\d:\d\d:\d\d(?:\.\d{6})?(?:[+-]\d\d(?::\d\d)?)?)?',
    re.IGNORECASE)



