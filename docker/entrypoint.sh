#!/bin/sh
set -e

if [ -n "$TZ" ]; then
  ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime
  echo "$TZ" > /etc/timezone
fi

PUID=${PUID:-1001}
PGID=${PGID:-1001}

groupmod -o -g "$PGID" appgroup
usermod -o -u "$PUID" appuser

exec su-exec appuser "$@"
