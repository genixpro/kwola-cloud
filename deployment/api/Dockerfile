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
    chromium-browser=87* \
    firefox \
    ffmpeg \
    fonts-liberation \
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
    libu2f-udev \
    libvulkan1 \
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
    build-essential \
     -y && \
    rm -rf /var/lib/apt/lists/*

# Install the linux build of Microsoft Edge
RUN wget https://packages.microsoft.com/repos/edge/pool/main/m/microsoft-edge-dev/microsoft-edge-dev_88.0.702.0-1_amd64.deb && \
    apt install -f ./microsoft-edge-dev_88.0.702.0-1_amd64.deb && \
    rm -rf microsoft-edge-dev_88.0.702.0-1_amd64.deb

# Install kubectl, used for controlling Kubernetes workers
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/`curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt`/bin/linux/amd64/kubectl && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/local/bin/kubectl && \
    kubectl version --client

# Download and install Chromedriver
RUN wget https://chromedriver.storage.googleapis.com/87.0.4280.88/chromedriver_linux64.zip && \
    unzip chromedriver_linux64.zip && \
    cp chromedriver /usr/bin/ && \
    chmod 644 /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver && \
    rm -rf chromedriver && \
    rm -rf chromedriver_linux64.zip

# Download and install Geckodriver
RUN wget https://github.com/mozilla/geckodriver/releases/download/v0.28.0/geckodriver-v0.28.0-linux64.tar.gz && \
    tar -xzf geckodriver-v0.28.0-linux64.tar.gz && \
    cp geckodriver /usr/bin/ && \
    chmod 644 /usr/bin/geckodriver && \
    chmod +x /usr/bin/geckodriver && \
    rm -rf geckodriver && \
    rm -rf geckodriver-v0.28.0-linux64.tar.gz

# Download and install Edgedriver
RUN wget https://msedgewebdriverstorage.blob.core.windows.net/edgewebdriver/88.0.702.0/edgedriver_linux64.zip && \
    unzip edgedriver_linux64.zip && \
    cp msedgedriver /usr/bin/ && \
    chmod 644 /usr/bin/msedgedriver && \
    chmod +x /usr/bin/msedgedriver && \
    rm -rf msedgedriver && \
    rm -rf Driver_Notes && \
    rm -rf edgedriver_linux64.zip

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

# Set the working directory to /app
WORKDIR /kwola
COPY server/requirements-frozen.txt .

# Install some dependencies which can take a long time to install. We do this ahead of running "ADD . /kwola" so the builds run faster when your
# making code changes regularly
RUN pip3 install --upgrade pip && \
    pip3 install --upgrade setuptools && \
    pip3 install --upgrade cryptography && \
    pip3 install torch && \
    pip3 install -r requirements-frozen.txt && \
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
    rm -rf /root/.cache && \
    chmod +r+r+r -R /usr/lib/python3/

# Install any dependencies specified in package.json
RUN sudo npm install -g && \
    sudo npm install && \
    rm -rf /root/.npm/_cacache

ARG KWOLA_ENV
ARG REVISION_ID
ENV KWOLA_ENV=${KWOLA_ENV}
ENV REVISION_ID=${REVISION_ID}
ENV GOOGLE_APPLICATION_CREDENTIALS=/kwola/deployment/kwola-cloud-2d7937574924.json
ENV CLOUDSDK_COMPUTE_ZONE=us-central1-c
ENV CLOUDSDK_CONTAINER_CLUSTER=testing-workers-2
ENV NODE_OPTIONS=--max-old-space-size=8192
RUN gcloud container clusters get-credentials testing-workers-2

RUN mkdir /home/kwola/.ssh && \
    echo "Host *\nStrictHostKeyChecking no" >> /home/kwola/.ssh/config && \
    chown -R kwola:kwola /home/kwola/.ssh && \
    chmod u+rw,og-rw /home/kwola/.ssh/config && \
    chmod u+rw,og-rw /home/kwola/.ssh

ENV HOME=/home/kwola
ENV KUBECONFIG=/home/kwola/kube_config
RUN chown -R kwola:kwola /kwola && \
    chown -R kwola:kwola /home/kwola && \
    chown -R kwola:kwola /home/kwola/.ssh && \
    chmod ugo+r -R /usr/lib/python3 && \
    su kwola -c "gcloud container clusters get-credentials testing-workers-2" && \
    su kwola -c "kubectl cluster-info" && \
    su kwola -c "kwola_install_proxy_cert 1" && \
    su kwola -c "mkdir -p /home/kwola/.pki" && \
    su kwola -c "mkdir -p /home/kwola/.pki/nssdb" && \
    su kwola -c "certutil -d sql:/home/kwola/.pki/nssdb -N" && \
    su kwola -c "certutil -d sql:/home/kwola/.pki/nssdb -A -n 'mitm.it cert authority' -i /home/kwola/.mitmproxy/mitmproxy-ca-cert.cer -t TCP,TCP,TCP"

RUN rm -rf /usr/include/*

WORKDIR /home/kwola
RUN chmod ugo+r -R /usr/lib/python3 && chown -R kwola:kwola /home/kwola && cd /home/kwola && su kwola -c "kwola_test_installation"
WORKDIR /kwola/server

# Output all the disk usage for various folders on the system.
# This helps us to further optimize the container
# RUN du -h -d 5 -t 10M /; exit 0

USER kwola:kwola


# Setup and configure systemd
ENTRYPOINT ["bash", "-c", "gunicorn -t 600 -w 16 -b 0.0.0.0:3000 kwolacloud.app"]

EXPOSE 3000

