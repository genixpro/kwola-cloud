#!/bin/env bash

KWOLA_INSTALL_DIR=/kwola

# Creating a user for Kwola
sudo useradd -s /bin/bash --home-dir /home/kwola kwola
sudo mkdir /home/kwola
sudo chown -R kwola:kwola /home/kwola

# Creating the python virtual environment using the newly compiled Python version
sudo mkdir $KWOLA_INSTALL_DIR
cd $KWOLA_INSTALL_DIR
sudo python3 -m venv venv
sudo su kwola -c "source venv/bin/activate; python3 setup.py install"

# Installing babel and the kwola babel plugin globally using npm
sudo npm install @babel/cli -g
sudo npm install @babel/core -g
sudo npm install babel-plugin-kwola -g

# Installing a copy of the babel plugin locally as well
sudo npm install babel-plugin-kwola
sudo rm -rf package-lock.json

echo "Setting all files in $KWOLA_INSTALL_DIR to have the owner 'kwola'. "
sudo chown kwola:kwola -R $KWOLA_INSTALL_DIR
