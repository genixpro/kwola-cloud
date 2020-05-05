# This builds an all-in-one easy to install dockerfile

FROM       python:3.6.8
MAINTAINER Kwola <info@kwola.io>

# Create important directories
RUN mkdir /kwola && \
    mkdir /kwola/deployment && \
    mkdir /kwola/client && \
    mkdir /kwola/server && \
    mkdir /kwola/server/models

# Install some basic system dependencies
COPY deployment/api_server/install_system_dependencies.sh /kwola/deployment
RUN chmod +x /kwola/deployment/install_system_dependencies.sh && sh /kwola/deployment/install_system_dependencies.sh

# Enable the google cloud service account
COPY kwola-cloud-da055f21a18f.json /kwola
WORKDIR /kwola
RUN gcloud auth activate-service-account --key-file /kwola/kwola-cloud-da055f21a18f.json

# Install the python dependencies. We do this ahead of running "ADD . /kwola" so the builds run faster when your
# making code changes regularly. As long as requirements file hasn't changed, then docker can use the cached image
COPY server/requirements.txt /kwola/server/requirements.txt
RUN pip3 install -r /kwola/server/requirements.txt

# We add package.json first so that the docker image build
# can use the cache as long as contents of package.json
# hasn't changed.
COPY client/package.json /kwola/client
WORKDIR /kwola/client
RUN npm install > "/dev/null" 2>&1

# Download latest machine learning models from gs cloud
WORKDIR /kwola/server/models
RUN gsutil cp gs://kwola-deployment/models.zip . && \
    unzip models.zip && \
    rm -rf models.zip

# Copy the current directory contents into the container at /kwola
ADD . /kwola
ARG KWOLA_ENV

# Install dependencies for client, which includes downloads
WORKDIR /kwola/server
RUN python3 setup.py install > "/dev/null" 2>&1

# Setup and configure systemd
ENTRYPOINT ["bash", "-c", "gunicorn -t 600 -w 4 -b 0.0.0.0:80 --paste $KWOLA_ENV.ini"]

EXPOSE 80

