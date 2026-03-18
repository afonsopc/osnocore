#!/bin/bash
# Wrapper that redirects a GUI app through xlaunch so it opens as a desktop window.
# Installed to ~/.local/bin/<appname>, shadowing the system binary.
# Usage: chromium [args...]  ->  xlaunch /usr/bin/chromium [args...]

SELF="$(basename "$0")"

# Find the real binary by skipping ourselves in PATH
REAL=""
IFS=: read -ra DIRS <<< "$PATH"
for dir in "${DIRS[@]}"; do
  candidate="$dir/$SELF"
  [ "$candidate" = "$(realpath "$0" 2>/dev/null)" ] && continue
  [ -x "$candidate" ] && { REAL="$candidate"; break; }
done

if [ -z "$REAL" ]; then
  echo "xwrap: could not find real '$SELF' in PATH" >&2
  exit 1
fi

exec xlaunch "$REAL" "$@"
