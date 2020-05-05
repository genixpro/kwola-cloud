#!/usr/bin/env bash

kubectl apply -f deployment/priorities/$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/api_server_deployment.yaml > api_server_deployment_$KWOLA_ENV.yaml
kubectl apply -f api_server_deployment_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/api_autoscaler.yaml > api_autoscaler_$KWOLA_ENV.yaml
kubectl apply -f api_autoscaler_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/api_service.yaml > api_service_$KWOLA_ENV.yaml
kubectl apply -f api_service_$KWOLA_ENV.yaml



