#!/bin/sh
# The test browser draws the model in software (no graphics card), which can fill every CPU core.
# Keep it on 2 cores at low priority so the computer stays quiet and usable.
exec taskset -c 6,7 nice -n 15 /usr/bin/chromium "$@"
