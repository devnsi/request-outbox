#!/usr/bin/env bash
curl -H 'Authorization: Basic user:password' --data '{"test": "value"}' localhost:3000/capture?targetUrl=http://localhost:8080/200
