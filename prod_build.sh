#!/bin/zsh

docker build --target production -t cubel-cloud:prod .
docker run --rm -p 8080:80 cubel-cloud:prod