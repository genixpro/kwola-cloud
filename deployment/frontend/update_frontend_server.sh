#!/usr/bin/env bash

kubectl apply -f deployment/priorities/$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/frontend_server/frontend_server_deployment.yaml > frontend_server_deployment_$KWOLA_ENV.yaml
kubectl apply -f frontend_server_deployment_$KWOLA_ENV.yaml


sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/frontend_server/frontend_autoscaler.yaml > frontend_autoscaler_$KWOLA_ENV.yaml
kubectl apply -f frontend_autoscaler_$KWOLA_ENV.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/frontend_server/frontend_service.yaml > frontend_service_$KWOLA_ENV.yaml
kubectl apply -f frontend_service_$KWOLA_ENV.yaml


