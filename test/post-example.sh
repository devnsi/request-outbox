#!/usr/bin/env bash
curl -H 'Authorization: Basic test' --data '{"test": "value"}' localhost:3000/capture?targetUrl=http://localhost:8080
