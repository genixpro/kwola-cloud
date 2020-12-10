import base64
import hmac
import json
import requests

def sendCustomerWebhook(application, webhookField, jsonData, isTestCall=False):
    targetURL = getattr(application, webhookField)

    if not targetURL:
        return False

    # Add in a value to the data being sent up to indicate which webhook this is.
    jsonData['hook'] = webhookField

    if not application.webhookSignatureSecret:
        application.generateWebhookSignatureSecret()
        application.save()

    if targetURL:
        dataBytes = bytes(json.dumps(jsonData), "utf8")
        keyBytes = bytes(application.webhookSignatureSecret, "utf8")

        signature = hmac.new(keyBytes, dataBytes, "sha256")

        headers = {
            "X-Kwola-Signature": base64.standard_b64encode(signature.digest()),
            "Content-Type": "application/json"
        }

        timeout = 60
        if isTestCall:
            timeout = 5

        try:
            response = requests.post(targetURL, dataBytes, headers=headers, timeout=timeout)
        except requests.exceptions.ConnectTimeout:
            return False
        except requests.exceptions.ConnectionError:
            return False

        if response.status_code != 200:
            return False
        else:
            return True
    else:
        return False

