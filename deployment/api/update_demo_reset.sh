#!/usr/bin/env bash

if [[ "$KWOLA_ENV" == "testing" || "$KWOLA_ENV" == "demo" ]] ;
    then
    sed "s/__REVISION_ID__/$REVISION_ID/g;s/__KWOLA_ENV__/$KWOLA_ENV/g" deployment/api/db_reset_job.yaml > db_reset_job_$KWOLA_ENV.yaml
    kubectl apply -f db_reset_job_$KWOLA_ENV.yaml
fi

