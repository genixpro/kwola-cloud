#!/usr/bin/env bash

if [[ "$KWOLA_ENV" == "testing" || "$KWOLA_ENV" == "demo" ]] ;
    then
    sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/demo_reset_job.yaml > demo_reset_job_$KWOLA_ENV.yaml
    kubectl apply -f demo_reset_job_$KWOLA_ENV.yaml
fi

