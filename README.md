# Kwola Cloud

Kwola Cloud is an application to work with kwola's core AI testing software. Our technology stack consists of:

- ReactJS
- Python 3
- MongoDB

## Development Setup

There are 3 main faucets to the Kwola Cloud development infrastructure: `client`, `database`, and `server`. To interact with and use the application locally, all 3 must be running.

The operating system that this setup has been verified for is `Ubuntu 18.04.3 LTS`. Any other version of Ubuntu or using a different OS altogether may require deviations from the steps outlined below.

### Setup Client

1. Navigate to `kwola-cloud/client/` and install the `node_modules`:

   ```bash
   npm ci
   ```

   **Note**: This step will only need to be run where there are changes to the `dependencies` or `devDependencies` of `package.json`.

2. Start ReactJS

   ```bash
   npm run start
   ```

   **Note**: This command will perform a development build of the React App and start the application at port `3000` (if port is available). This also watches for file changes in the React App and rebuilds the app in real-time.

### Setup Database

This step involves installing and running MongoDB. We highly recommend running MongoDB using to reduce complexity and improve flexibility of your installation. To do so, you must satisfy the following pre-requisites:

| Requisite                     | Recommendation     |
| ----------------------------- | ------------------ |
| `docker` and `docker-compose` | Highly Recommended |

1. To start the MongoDB container, navigate to `kwola-cloud/devops` and run:

   ```bash
   docker-compose up
   ```

To daemonize the MongoDB installation, you may run the above command appended with a `-d` flag. The docker instance will bind to `localhost:27017`.

**Note**: Since the `docker-compose.yml` configuration file does not have a `volume` mounted for this container, the data in MongoDB will not persist when the container is restarted. You may make such modifications to the `docker-compose.yml` file if you require the data in the containerized database to persist when the container is restarted.

### Setup Server

The server is a Python backend hosted on port `8000` and it responds to requests from the client. Here are some pre-requisites:

| Requisite                                               | Recommendation |
| ------------------------------------------------------- | -------------- |
| `python` (`3.6`, `3.7`, or `3.8`); `3.8` is recommended | Required       |
| `google-cloud-sdk`                                      | Required       |

To provision your system for development, please run the following set of steps:

1. To setup google cloud signin, please run the following set of steps:

   ```bash
   # add the cloud SDK distribution URI as a package source
   echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

   # import the Google Cloud Platform public key:
   curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

   # update the package list and install the Cloud SDK
   sudo apt-get update && sudo apt-get install google-cloud-sdk

   # add the kwolacloud project with this command
   gcloud init

   # login with this command with gmail account
   gcloud auth application-default login
   ```

2. It is recommended to create a python virtual environment to avoid conflicts. Navigate into `kwola-cloud/server/` and run the following commands to so:

   ```bash
   python -m venv venv
   ```

   To activate the `venv`, run the following command:

   ```bash
   venv/bin/activate
   ```

   To deactivate the `venv`, run the following command:

   ```bash
   deactivate
   ```

   **Note**: We will want to stay activated for the remainder of the steps so please remain activated in the `venv` that was just created and do not deactivate for the steps to follow.

3. We will now install and setup the python server.

   ```bash
   python setup.py develop
   ```

4. To start the server, run the following command:

   ```bash
   gunicorn kwolacloud.app
   ```

   **Note**: You must ensure that the database is started prior to starting the server. If not, the server will timeout waiting for an active database connection.
