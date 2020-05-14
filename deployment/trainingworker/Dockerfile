# This builds an all-in-one easy to install dockerfile

FROM ubuntu:18.04
MAINTAINER Kwola <info@kwola.io>

ENV DEBIAN_FRONTEND noninteractive
ENV GCSFUSE_REPO=gcsfuse-bionic

RUN apt-get update && apt-get install -y --no-install-recommends gnupg1 gnupg2 gnupg curl ca-certificates && \
    curl -fsSL https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/7fa2af80.pub | apt-key add - && \
    echo "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64 /" > /etc/apt/sources.list.d/cuda.list && \
    echo "deb https://developer.download.nvidia.com/compute/machine-learning/repos/ubuntu1804/x86_64 /" > /etc/apt/sources.list.d/nvidia-ml.list && \
    echo "deb http://packages.cloud.google.com/apt cloud-sdk-stretch main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash && \
    echo "deb http://packages.cloud.google.com/apt $GCSFUSE_REPO main" | tee /etc/apt/sources.list.d/gcsfuse.list

ENV CUDA_VERSION 10.0.130
ENV NCCL_VERSION 2.4.2
ENV CUDNN_VERSION 7.5.1.10
ENV NCCL_VERSION 2.4.2


ENV CUDA_PKG_VERSION 10-0=$CUDA_VERSION-1

# For libraries in the cuda-compat-* package: https://docs.nvidia.com/cuda/eula/index.html#attachment-a
RUN apt-get update && apt-get install -y --no-install-recommends \
        cuda-cudart-$CUDA_PKG_VERSION \
        cuda-compat-10-0 > "/dev/null" 2>&1 && \
    ln -s cuda-10.0 /usr/local/cuda

RUN apt-get update && apt-get install -y --no-install-recommends \
            libcudnn7=$CUDNN_VERSION-1+cuda10.0 \
            libcudnn7-dev=$CUDNN_VERSION-1+cuda10.0 > "/dev/null" 2>&1 && \
    apt-mark hold libcudnn7

RUN apt-get update && apt-get install -y --no-install-recommends \
        cuda-libraries-$CUDA_PKG_VERSION \
        cuda-nvtx-$CUDA_PKG_VERSION \
        libnccl2=$NCCL_VERSION-1+cuda10.0 > "/dev/null" 2>&1 && \
        apt-mark hold libnccl2

RUN apt-get update && apt-get install -y --no-install-recommends \
        cuda-libraries-dev-$CUDA_PKG_VERSION \
        cuda-nvml-dev-$CUDA_PKG_VERSION \
        cuda-minimal-build-$CUDA_PKG_VERSION \
        cuda-command-line-tools-$CUDA_PKG_VERSION \
        libnccl-dev=$NCCL_VERSION-1+cuda10.0  > "/dev/null" 2>&1 



ENV LIBRARY_PATH /usr/local/cuda/lib64/stubs

# Required for nvidia-docker v1
RUN echo "/usr/local/nvidia/lib" >> /etc/ld.so.conf.d/nvidia.conf && \
    echo "/usr/local/nvidia/lib64" >> /etc/ld.so.conf.d/nvidia.conf

ENV PATH /usr/local/nvidia/bin:/usr/local/cuda/bin:${PATH}
ENV LD_LIBRARY_PATH /usr/local/nvidia/lib:/usr/local/nvidia/lib64

# nvidia-container-runtime
ENV NVIDIA_VISIBLE_DEVICES all
ENV NVIDIA_DRIVER_CAPABILITIES compute,utility
ENV NVIDIA_REQUIRE_CUDA "cuda>=10.0 brand=tesla,driver>=384,driver<385 brand=tesla,driver>=410,driver<411"


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
    -y \
    && \
    rm -rf /var/lib/apt/lists/*

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
ENV GOOGLE_APPLICATION_CREDENTIALS=/kwola/deployment/kwola-cloud-2d7937574924.json

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
ENTRYPOINT ["/usr/local/bin/celery", "-A", "kwolacloud.app", "worker", "--queues", "training", "-c", "1", "-E", "--max-tasks-per-child", "1", "-l", "DEBUG"]

EXPOSE 80
