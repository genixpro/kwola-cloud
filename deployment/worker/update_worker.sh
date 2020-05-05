#!/usr/bin/env bash

sed "s/__REVISION_ID__/$REVISION_ID/g" deployment/worker/worker.yaml > worker.yaml
kubectl apply -f worker.yaml
