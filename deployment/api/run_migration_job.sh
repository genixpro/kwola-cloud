#!/usr/bin/env bash



sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/migration_job.yaml > migration_job_$KWOLA_ENV.yaml
kubectl delete -f migration_job_$KWOLA_ENV.yaml
kubectl create -f migration_job_$KWOLA_ENV.yaml

if [[ "$KWOLA_ENV" == "demo" ]] ;
    then
    kubectl apply -f deployment/priorities/demobackup.yaml
    kubectl apply -f deployment/priorities/demobackup_background.yaml
    sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/demobackup/g" deployment/api/migration_job.yaml > migration_job_demobackup.yaml
    sed "s/kwola-api-demobackup/kwola-api-demo/g" -i migration_job_demobackup.yaml
    kubectl delete -f migration_job_demobackup.yaml
    kubectl create -f migration_job_demobackup.yaml
fi
