#!/usr/bin/env bash

git checkout -f
git checkout staging
git pull
git merge master -m "Merged from master->staging for release to staging environment."
git push
git checkout master

