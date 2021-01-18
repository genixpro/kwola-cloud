import logging
import requests
from ..config.config import loadCloudConfiguration, getKwolaConfiguration
from kwola.config.config import KwolaCoreConfiguration
import os.path


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

    issueData = {
        "fields": {
            "project": {
                "id": application.jiraProject
            },
            "issuetype": {
                "id": application.jiraIssueType
            },
            "description": bug.error.message,
            "summary": bug.error.message[:150]
        }
    }

    jiraAPIResponse = requests.post(f"https://api.atlassian.com/ex/jira/{application.jiraCloudId}/rest/api/2/issue",
                                    json=issueData,
                                    headers=headers)

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
