#!/usr/bin/env bash

sed "s/__REVISION_ID__/$REVISION_ID/g" deployment/worker/worker_deployment.yaml > worker.yaml
kubectl apply -f worker.yaml

sed "s/__REVISION_ID__/$REVISION_ID/g" deployment/worker/worker_autoscaler.yaml > worker.yaml
kubectl apply -f worker.yaml
