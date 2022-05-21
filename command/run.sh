#!/bin/bash
if [[ ! -z $1 ]]; then
  npx babel --quiet $1 -o .cmd/out.js -x .ts && \
  node .cmd/out.js "${@:2}"
else
  echo "File name must be provided."
  exit 1
fi
