#!/usr/bin/env bash

git checkout -f
git checkout release
git pull
git merge staging -m "Merged from staging->release for release to production environment."
git push
git checkout master

