#!/bin/sh

# Start OIDC configuration server in the background
cd /app
node server/oidc-server.cjs &

# Start nginx in the foreground
nginx -g "daemon off;"