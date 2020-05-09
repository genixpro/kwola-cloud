#!/usr/bin/env bash

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/training_worker/worker_deployment.yaml > worker.yaml
kubectl apply -f worker.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/training_worker/worker_autoscaler.yaml > worker.yaml
kubectl apply -f worker.yaml
