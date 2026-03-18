#!/bin/sh
export SUDO_ASKPASS=/app/scripts/sudo-askpass.sh
exec /usr/bin/sudo -A "$@"
