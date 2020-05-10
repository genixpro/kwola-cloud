#!/bin/env bash

# Install node
export GCSFUSE_REPO=gcsfuse-`lsb_release -c -s`
echo "deb http://packages.cloud.google.com/apt $GCSFUSE_REPO main" | sudo tee /etc/apt/sources.list.d/gcsfuse.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
curl -sL https://deb.nodesource.com/setup_12.x | bash

# Install system packages
apt-get update

apt-get install \
    build-essential \
    gfortran \
    git \
    google-cloud-sdk \
    gcsfuse \
    libatlas-base-dev \
    libblas-dev \
    libcurl4-openssl-dev \
    liblapack-dev \
    libnss3-tools \
    libpng-dev \
    libssl-dev \
    libxml2-dev \
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
     -y

rm -rf /var/lib/apt/lists/*

# Upgrade version of pip and setuptools
pip3 install --upgrade pip
pip3 install --upgrade setuptools

# Download and install Chromedriver
wget https://chromedriver.storage.googleapis.com/80.0.3987.106/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
sudo cp chromedriver /usr/bin/
sudo chmod 644 /usr/bin/chromedriver
sudo chmod +x /usr/bin/chromedriver
rm -rf chromedriver
rm -rf chromedriver_linux64.zip

