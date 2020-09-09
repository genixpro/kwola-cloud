#!/usr/bin/env bash

# shellcheck disable=SC1090
source deployment/environments/$KWOLA_ENV.sh

kubectl apply -f deployment/priorities/default.yaml
kubectl apply -f deployment/priorities/$KWOLA_ENV.yaml
kubectl apply -f deployment/priorities/${KWOLA_ENV}_background.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g;s/__MAX_SURGE__/$MAX_SURGE/g;s/__MAX_UNAVAILABLE__/$MAX_UNAVAILABLE/g" deployment/api/api_server_deployment.yaml > api_server_deployment_$KWOLA_ENV.yaml
kubectl apply -f api_server_deployment_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g;s/__MINIMUM_REPLICATIONS__/$MINIMUM_REPLICATIONS/g;s/__MAXIMUM_REPLICATIONS__/$MAXIMUM_REPLICATIONS/g" deployment/api/api_autoscaler.yaml > api_autoscaler_$KWOLA_ENV.yaml
kubectl apply -f api_autoscaler_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/api_service.yaml > api_service_$KWOLA_ENV.yaml
kubectl apply -f api_service_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/hourly_tasks.yaml > hourly_tasks_$KWOLA_ENV.yaml
kubectl apply -f hourly_tasks_$KWOLA_ENV.yaml
