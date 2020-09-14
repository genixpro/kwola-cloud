#!/usr/bin/env bash

# Temporarily comment out the running of the migration job

sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/migration_job.yaml > migration_job_$KWOLA_ENV.yaml
kubectl delete -f migration_job_$KWOLA_ENV.yaml
kubectl create -f migration_job_$KWOLA_ENV.yaml