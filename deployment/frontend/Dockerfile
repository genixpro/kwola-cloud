# This builds an all-in-one easy to install dockerfile

FROM       python:3.6.8
MAINTAINER Kwola <info@kwola.io>

ENV DEBIAN_FRONTEND noninteractive

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash

# Install some basic system dependencies
RUN apt-get update && apt-get install \
    nginx \
    nodejs -y > "/dev/null" 2>&1 && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory to /app
WORKDIR /kwola

# We add package.json first so that the  docker image build
# can use the cache as long as contents of package.json
# hasn't changed.
RUN mkdir /kwola/client
COPY client/package.json /kwola/client
WORKDIR /kwola/client
RUN npm install

ARG KWOLA_ENV

# Copy the NGINX configuration
ADD deployment/frontend/nginx_${KWOLA_ENV} /etc/nginx/sites-enabled/default
ADD deployment/ssl/kwola.key /etc/nginx/ssl/nginx.key
ADD deployment/ssl/certbundle.pem /etc/nginx/ssl/nginx.pem

# Copy the current directory contents into the container at /kwola
ADD client /kwola/client

# Set the working directory to /kwola/client, and build the frontend package
WORKDIR /kwola/client
ENV VALUATE_ENV=${KWOLA_ENV}

# Build the frontend static files and delete all the kwola code, nodejs and python to trim down the image size
RUN npm run-script build && \
        mkdir /build && \
        mv build/* /build && \
        rm -rf /kwola && \
        apt-get purge nodejs python3 -y

# Setup and configure systemd
ENTRYPOINT ["/usr/sbin/nginx", "-g", "daemon off;"]
EXPOSE 80
EXPOSE 443

