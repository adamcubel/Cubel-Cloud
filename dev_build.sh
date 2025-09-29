#!/bin/zsh

docker build --target development -t cubel-cloud:dev .
docker run --rm -p 3000:3000 -v "$(pwd):/app" -v /app/node_modules cubel-cloud:dev