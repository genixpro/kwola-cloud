## Kwola Cloud

Kwola Cloud is an application to work with kwola's core AI testing software.  

### Setup Client
go to kwola-cloud client folder 
```npm run-script build```

start static server
```serve -s build```

start the react application
```npm run-script start```

### Setup Server
start localhost8000 server inside server folder of kwola cloud (python3.8 works best, 3.6 may work also).
this should be done inside a venv (source venv/bin/activate)

Run setup script for development

```sudo python3 setup.py develop```

 Setup google cloud signin.
 Add the Cloud SDK distribution URI as a package source:
 
```echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list```

Import the Google Cloud Platform public key:

```curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -```

Update the package list and install the Cloud SDK
```sudo apt-get update && sudo apt-get install google-cloud-sdk```

add the kwolacloud project with this command
```gcloud init```

login with this command with gmail account
```gcloud auth application-default login```

finish launching server app (/kwolacloud) with gunicorn
```gunicorn kwolacloud.app```




