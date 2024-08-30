#!/usr/bin/env bash
curl -H 'Content-Type: application/json' --data '{"test": "value"}' localhost:3000/capture?targetUrl=http://localhost:8080
