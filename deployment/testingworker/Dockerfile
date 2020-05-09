# This builds an all-in-one easy to install dockerfile

FROM ubuntu:18.04
MAINTAINER Kwola <info@kwola.io>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install gnupg2 gnupg1 gnupg curl -y

RUN echo 'deb http://packages.cloud.google.com/apt cloud-sdk-stretch main' | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash

# Install some basic system dependencies
RUN apt-get update && apt-get install \
    chromium-browser \
    ffmpeg \
    freetype* \
    fuse \
    fuse-dbg \
    g++ \
    gcc \
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
     -y && \
    rm -rf /var/lib/apt/lists/*

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

# Setup and configure systemd
ENTRYPOINT ["/usr/local/bin/celery", "-A", "kwolacloud.app", "worker", "--queues", "testing", "-c", "1"]

EXPOSE 80
