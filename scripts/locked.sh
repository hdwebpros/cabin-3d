#!/bin/sh
# Runs a command that opens the test browser, one at a time (the computer has little free memory).
# A locked command that starts another locked command does not wait for itself. The wait gives up
# after 40 minutes, so a lock taken by hand around "npm run ..." cannot block everything forever.
[ -n "$CABIN_LOCKED" ] && exec "$@"
export CABIN_LOCKED=1
exec flock -w 2400 "$(dirname "$0")/../work/.shot.lock" "$@"
