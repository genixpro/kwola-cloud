# This builds an all-in-one easy to install dockerfile

FROM ubuntu:18.04
MAINTAINER Kwola <info@kwola.io>

ENV DEBIAN_FRONTEND noninteractive
ENV GCSFUSE_REPO=gcsfuse-bionic

RUN apt-get update && apt-get install gnupg2 gnupg1 gnupg curl -y && \
    echo "deb http://packages.cloud.google.com/apt cloud-sdk-stretch main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash && \
    echo "deb http://packages.cloud.google.com/apt $GCSFUSE_REPO main" | tee /etc/apt/sources.list.d/gcsfuse.list

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
     -y && \
    rm -rf /var/lib/apt/lists/*

# Install kubectl, used for controlling Kubernetes workers
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/`curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt`/bin/linux/amd64/kubectl && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/local/bin/kubectl && \
    kubectl version --client

# Download and install Chromedriver
RUN wget https://chromedriver.storage.googleapis.com/81.0.4044.138/chromedriver_linux64.zip && \
    unzip chromedriver_linux64.zip && \
    cp chromedriver /usr/bin/ && \
    chmod 644 /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver && \
    rm -rf chromedriver_linux64.zip

# Installing babel and the kwola babel plugin globally using npm
RUN sudo npm install @babel/cli -g && \
    sudo npm install @babel/core -g && \
    sudo npm install babel-plugin-kwola -g && \
    sudo npm install babel-plugin-kwola && \
    rm -rf /root/.npm/_cacache

# Create the kwola user
RUN useradd -s /bin/bash --home-dir /home/kwola kwola && \
    mkdir /home/kwola && \
    chown -R kwola:kwola /home/kwola

# Install some dependencies which can take a long time to install. We do this ahead of running "ADD . /kwola" so the builds run faster when your
# making code changes regularly
RUN pip3 install --upgrade pip && \
    pip3 install --upgrade setuptools && \
    pip3 install --upgrade cryptography && \
    pip3 install celery && \
    pip3 install flask && \
    pip3 install google-cloud-storage && \
    pip3 install gunicorn && \
    pip3 install jwcrypto && \
    pip3 install matplotlib && \
    pip3 install mitmproxy && \
    pip3 install mongoengine && \
    pip3 install numpy && \
    pip3 install opencv-python && \
    pip3 install pandas && \
    pip3 install psutil && \
    pip3 install redis && \
    pip3 install scikit-image && \
    pip3 install scikit-learn && \
    pip3 install scipy && \
    pip3 install selenium && \
    pip3 install stripe && \
    pip3 install torch && \
    chmod +r+r+r -R /usr/lib/python3/ && \
    rm -rf /root/.cache

# Remove stuff that is no longer needed after all this installation
RUN apt purge -y \
         vim \
         gcc \
         python3-dev && \
    rm -rf /var/log/* && \
    rm -rf /usr/share/icons/* && \
    rm -rf /usr/share/doc/* && \
    rm -rf /usr/share/man/* && \
    rm -rf /var/cache/* && \
    rm -rf /var/lib/dpkg/*

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
RUN python3 setup.py install && \
    rm -rf /root/.cache

ARG KWOLA_ENV
ENV KWOLA_ENV=${KWOLA_ENV}
ENV REVISION_ID=${REVISION_ID}
ENV GOOGLE_APPLICATION_CREDENTIALS=/kwola/deployment/kwola-cloud-2d7937574924.json
ENV CLOUDSDK_COMPUTE_ZONE=us-central1-c
ENV CLOUDSDK_CONTAINER_CLUSTER=testing-workers
RUN gcloud container clusters get-credentials testing-workers
RUN su kwola -c "gcloud container clusters get-credentials testing-workers"

ENV HOME=/home/kwola
RUN chown -R kwola:kwola /kwola && \
    chown -R kwola:kwola /home/kwola && \
    chmod +r+r+r -R /usr/lib/python3 && \
    su kwola -c "kwola_install_proxy_cert 1" && \
    su kwola -c "mkdir -p /home/kwola/.pki" && \
    su kwola -c "mkdir -p /home/kwola/.pki/nssdb" && \
    su kwola -c "certutil -d sql:/home/kwola/.pki/nssdb -N" && \
    su kwola -c "certutil -d sql:/home/kwola/.pki/nssdb -A -n 'mitm.it cert authority' -i /home/kwola/.mitmproxy/mitmproxy-ca-cert.cer -t TCP,TCP,TCP"

RUN rm -rf /usr/include/*

RUN su kwola -c "kwola_test_installation"

# Output all the disk usage for various folders on the system.
# This helps us to further optimize the container
RUN du -h -d 5 -t 10M /; exit 0

USER kwola

# Setup and configure systemd
ENTRYPOINT ["bash", "-c", "gunicorn -t 600 -w 4 -b 0.0.0.0:3000 kwolacloud.app"]

EXPOSE 3000

