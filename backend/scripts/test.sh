#!/bin/bash

ENV_FILE=../.env

### Set Environment Variables
set -a # automatically export all variables
[ -f $ENV_FILE ] && source $ENV_FILE
set +a

APP_VERSION=$(git rev-parse --short HEAD)
# unset DATABASE_URL # Clear so will use sqlite
# unset MINIO_HOST

if [ -z "$1" ]
then
   echo ">> Running all test cases"
    python3 -m pytest -s tests
else
   echo ">> Running single test case"
    python3 -m pytest -s $@ -rs
fi