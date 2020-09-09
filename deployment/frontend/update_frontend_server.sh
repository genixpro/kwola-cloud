#!/usr/bin/env bash

# shellcheck disable=SC1090
source deployment/environments/$KWOLA_ENV.sh


kubectl apply -f deployment/priorities/default.yaml
kubectl apply -f deployment/priorities/$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/frontend/frontend_server_deployment.yaml > frontend_server_deployment_$KWOLA_ENV.yaml
kubectl apply -f frontend_server_deployment_$KWOLA_ENV.yaml


sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g;s/__MINIMUM_REPLICATIONS__/$MINIMUM_REPLICATIONS/g;s/__MAXIMUM_REPLICATIONS__/$MAXIMUM_REPLICATIONS/g" deployment/frontend/frontend_autoscaler.yaml > frontend_autoscaler_$KWOLA_ENV.yaml
kubectl apply -f frontend_autoscaler_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/frontend/frontend_service.yaml > frontend_service_$KWOLA_ENV.yaml
kubectl apply -f frontend_service_$KWOLA_ENV.yaml


