# This builds an all-in-one easy to install dockerfile

FROM ubuntu:18.04
MAINTAINER Kwola <info@kwola.io>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install gnupg2 gnupg1 gnupg curl -y

RUN echo "deb http://packages.cloud.google.com/apt cloud-sdk-stretch main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash
ENV GCSFUSE_REPO=gcsfuse-bionic
RUN echo "deb http://packages.cloud.google.com/apt $GCSFUSE_REPO main" | tee /etc/apt/sources.list.d/gcsfuse.list

# Install some basic system dependencies
RUN apt-get update && apt-get install \
    chromium-browser \
    ffmpeg \
    freetype* \
    fuse \
    fuse-dbg \
    g++ \
    gcc \
    gcsfuse \
    gfortran \
    git \
    google-cloud-sdk \
    libatlas-base-dev \
    libblas-dev \
    libcurl4-openssl-dev \
    liblapack-dev \
    libnss3-tools \
    libpng-dev \
    libsm6 \
    libssl-dev \
    libxext6 \
    libxml2-dev \
    mime-support \
    libxrender-dev \
    mime-support \
    nodejs \
    python3 \
    python3-dev \
    python3-pip \
    python3-setuptools \
    python3-tk \
    python3-venv \
    sudo \
    unzip \
    vim \
    wget \
    -y  > "/dev/null" 2>&1 && \
    rm -rf /var/lib/apt/lists/*

# Download and install Chromedriver
RUN wget https://chromedriver.storage.googleapis.com/81.0.4044.138/chromedriver_linux64.zip
RUN unzip chromedriver_linux64.zip
RUN cp chromedriver /usr/bin/
RUN chmod 644 /usr/bin/chromedriver
RUN chmod +x /usr/bin/chromedriver
RUN rm -rf chromedriver
RUN rm -rf chromedriver_linux64.zip

# Installing babel and the kwola babel plugin globally using npm
RUN sudo npm install @babel/cli -g
RUN sudo npm install @babel/core -g
RUN sudo npm install babel-plugin-kwola -g
RUN sudo npm install babel-plugin-kwola

# Create the kwola user
RUN useradd -s /bin/bash --home-dir /home/kwola kwola
RUN mkdir /home/kwola
RUN chown -R kwola:kwola /home/kwola

# Install some dependencies which can take a long time to install. We do this ahead of running "ADD . /kwola" so the builds run faster when your
# making code changes regularly
RUN pip3 install --upgrade pip
RUN pip3 install --upgrade setuptools
RUN pip3 install numpy
RUN pip3 install scikit-learn
RUN pip3 install matplotlib
RUN pip3 install gunicorn
RUN pip3 install flask

# Set the working directory to /app
WORKDIR /kwola

# Copy the current directory contents into the container at /kwola
ADD . /kwola

WORKDIR /kwola
RUN gcloud auth activate-service-account --key-file deployment/kwola-cloud-2d7937574924.json

# Delete everything in the client directory
RUN rm -rf /kwola/client

# Install dependencies for server
WORKDIR /kwola/server
RUN python3 setup.py install

ARG KWOLA_ENV
ENV KWOLA_ENV=${KWOLA_ENV}
ENV GOOGLE_APPLICATION_CREDENTIALS=/kwola/deployment/kwola-cloud-2d7937574924.json

RUN chown -R kwola:kwola /kwola
USER kwola
ENV HOME=/home/kwola
RUN kwola_install_proxy_cert 1
RUN mkdir -p /home/kwola/.pki
RUN mkdir -p /home/kwola/.pki/nssdb
RUN certutil -d sql:/home/kwola/.pki/nssdb -N
RUN certutil -d sql:/home/kwola/.pki/nssdb -A -n 'mitm.it cert authority' -i /home/kwola/.mitmproxy/mitmproxy-ca-cert.cer -t TCP,TCP,TCP

RUN kwola_test_installation

USER root

# Setup and configure systemd
ENTRYPOINT ["/usr/local/bin/celery", "-A", "kwolacloud.app", "worker", "--queues", "default"]

EXPOSE 80
