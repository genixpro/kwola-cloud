#!/bin/env bash

# Install node
echo "deb http://packages.cloud.google.com/apt gcsfuse-bionic main" | tee /etc/apt/sources.list.d/gcsfuse.list
echo "deb http://packages.cloud.google.com/apt cloud-sdk-stretch main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
curl -sL https://deb.nodesource.com/setup_12.x | bash

# Install system packages
apt-get update

apt-get install \
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

# Installing babel and the kwola babel plugin globally using npm
sudo npm install @babel/cli -g
sudo npm install @babel/core -g
sudo npm install babel-plugin-kwola -g
sudo npm install babel-plugin-kwola

# Create the kwola user
useradd -s /bin/bash --home-dir /home/kwola kwola
mkdir /home/kwola
chown -R kwola:kwola /home/kwola
