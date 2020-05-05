#!/bin/env bash

# Install node
echo "deb http://packages.cloud.google.com/apt cloud-sdk-stretch main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
curl -sL https://deb.nodesource.com/setup_12.x | bash

# Install system packages
apt-get update

apt-get install \
    build-essential \
    git \
    wget \
    sudo \
    vim \
    python3 \
    python3-pip \
    python3-setuptools \
    python3-tk \
    python3-dev \
    libpng-dev \
    freetype* \
    libblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    unzip \
    google-cloud-sdk \
    nodejs \
    gfortran \
    libcurl4-openssl-dev \
    libxml2-dev \
    mime-support \
    libssl-dev \
    python3-venv \
    libnss3-toolsfortran \
     -y > "/dev/null" 2>&1

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

