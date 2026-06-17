#!/bin/sh
set -eu
chown node:node public/uploads 2>/dev/null || true
exec su-exec node /sbin/tini -- "$@"
