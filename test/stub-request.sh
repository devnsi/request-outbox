#!/usr/bin/env bash
curl -v \
    -H 'Authorization: Basic dXNlcjpwYXNzd29yZA==' \
    -H 'Content-Type: application/json' \
    --data '{"test": "value"}' \
    localhost:3000/capture?targetUrl=http://localhost:8080/200-curled-request
