# This builds an all-in-one easy to install dockerfile

FROM ubuntu:18.04
MAINTAINER Kwola <info@kwola.io>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install gnupg2 gnupg1 gnupg curl -y

# Create important directories
RUN mkdir /kwola && \
    mkdir /kwola/deployment && \
    mkdir /kwola/client && \
    mkdir /kwola/server && \
    mkdir /kwola/server/models

# Install some basic system dependencies
COPY deployment/api/install_system_dependencies.sh /kwola/deployment
RUN chmod +x /kwola/deployment/install_system_dependencies.sh && sh /kwola/deployment/install_system_dependencies.sh

RUN echo "Installing babel and the kwola babel plugin globally using npm"
RUN sudo npm install @babel/cli -g
RUN sudo npm install @babel/core -g
RUN sudo npm install babel-plugin-kwola -g
RUN sudo npm install babel-plugin-kwola

# Enable the google cloud service account
COPY deployment/kwola-cloud-2d7937574924.json /kwola
WORKDIR /kwola
RUN gcloud auth activate-service-account --key-file /kwola/kwola-cloud-2d7937574924.json

# Install the python dependencies. We do this ahead of running "ADD . /kwola" so the builds run faster when your
# making code changes regularly. As long as requirements file hasn't changed, then docker can use the cached image
COPY server/requirements.txt /kwola/server/requirements.txt
RUN pip3 install flask
RUN pip3 install -r /kwola/server/requirements.txt

# We add package.json first so that the docker image build
# can use the cache as long as contents of package.json
# hasn't changed.
COPY client/package.json /kwola/client
WORKDIR /kwola/client
RUN npm install > "/dev/null" 2>&1

# Copy the current directory contents into the container at /kwola
ADD . /kwola
RUN chown -R kwola:kwola /kwola
USER kwola
WORKDIR /kwola

ARG KWOLA_ENV
ENV KWOLA_ENV=${KWOLA_ENV}
ENV GOOGLE_APPLICATION_CREDENTIALS=/kwola/deployment/kwola-cloud-2d7937574924.json

RUN kwola_install_proxy_cert 1
RUN certutil -d sql:/home/kwola/.pki/nssdb -A -n 'mitm.it cert authority' -i /home/kwola/.mitmproxy/mitmproxy-ca-cert.cer -t TCP,TCP,TCP

# Install dependencies for client, which includes downloads
WORKDIR /kwola/server
RUN python3 setup.py install > "/dev/null" 2>&1

# Install some basic system dependencies
COPY deployment/api/install_kwola.sh /kwola/deployment
RUN chmod +x /kwola/deployment/install_kwola.sh && sh /kwola/deployment/install_kwola.sh

RUN kwola_test_installation

# Setup and configure systemd
ENTRYPOINT ["bash", "-c", "gunicorn -t 600 -w 4 -b 0.0.0.0:80 kwolacloud.app"]

EXPOSE 80

