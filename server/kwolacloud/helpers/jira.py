import logging
import requests
from ..config.config import loadCloudConfiguration, getKwolaConfiguration
from kwola.config.config import KwolaCoreConfiguration
import os.path
from kwola.datamodels.errors.HttpError import HttpError
from kwola.datamodels.errors.LogError import LogError
from kwola.datamodels.errors.ExceptionError import ExceptionError


def postBugToCustomerJIRA(bug, application):
    if not application.jiraAccessToken:
        return

    if not application.jiraProject:
        return

    if not application.jiraIssueType:
        return

    refreshTokenSuccess = application.refreshJiraAccessToken()
    if not refreshTokenSuccess:
        return

    headers = {
        "Authorization": f"Bearer {application.jiraAccessToken}",
        "Content-Type": "application/json"
    }


    jiraBugDescription = f"Bug Type: {str(type(bug.error))}\n"
    jiraBugDescription += f"Page: {bug.error.page}\n"

    if isinstance(bug.error, HttpError):
        jiraBugDescription += f"""HTTP Status Code: {bug.error.statusCode}\n"""
        jiraBugDescription += f"""HTTP Request URL: {bug.error.url}\n"""

    jiraBugDescription += f"Browser: {bug.browser}\n"
    jiraBugDescription += f"Window Size: {bug.windowSize}\n"
    jiraBugDescription += f"User Agent: {bug.userAgent}\n"
    jiraBugDescription += f"Importance: {bug.importanceLevel}\n"
    jiraBugDescription += f"Message: {bug.message}\n"

    jiraBugSummary = ""
    if isinstance(bug.error, HttpError):
        jiraBugSummary = f"HTTP {bug.error.statusCode} at {bug.error.url}"
    else:
        jiraBugSummary = jiraBugDescription[:150]

    issueData = {
        "fields": {
            "project": {
                "id": application.jiraProject
            },
            "issuetype": {
                "id": application.jiraIssueType
            },
            "description": jiraBugDescription,
            "summary": jiraBugSummary
        }
    }
    jiraAPIResponse = requests.post(f"https://api.atlassian.com/ex/jira/{application.jiraCloudId}/rest/api/2/issue",
                                    json=issueData,
                                    headers=headers)

    if isinstance(bug.error, ExceptionError):
        jiraBugDescription += f"Stacktrace: {bug.error.stacktrace}\n"

    if jiraAPIResponse.status_code > 299:
        logging.error(f"Error creating issue in JIRA. Status code: {jiraAPIResponse.status_code}. Text: {jiraAPIResponse.text}")
        return
    else:
        issueId = jiraAPIResponse.json()['id']

        config = application.defaultRunConfiguration.createKwolaCoreConfiguration(application.owner, application.id, bug.testingRunId)

        videoData = config.loadKwolaFileData("bugs", f'{str(bug.id)}_bug_{str(bug.executionSessionId)}.mp4')

        files = {'file': videoData}

        uploadMovieHeaders = {
            "Authorization": f"Bearer {application.jiraAccessToken}",
            "X-Atlassian-Token": "no-check"
        }

        jiraAPIResponse = requests.post(
            f"https://api.atlassian.com/ex/jira/{application.jiraCloudId}/rest/api/2/issue/{issueId}/attachments",
            files=files,
            headers=uploadMovieHeaders)
        if jiraAPIResponse.status_code != 200:
            logging.error(f"Error uploading attachment to issue in JIRA. Status code: {jiraAPIResponse.status_code}. Text: {jiraAPIResponse.text}")
            return
