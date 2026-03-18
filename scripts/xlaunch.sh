#!/bin/bash
# Launch an X application as its own window in the web desktop.
# Usage: xlaunch <command> [args...]
# Example: xlaunch chromium --no-sandbox

CMD="$*"
if [ -z "$CMD" ]; then
  echo "Usage: xlaunch <command> [args...]"
  echo "Example: xlaunch chromium --no-sandbox"
  exit 1
fi

# JSON-escape the command
ESCAPED=$(printf '%s' "$CMD" | sed 's/\\/\\\\/g; s/"/\\"/g')

RESULT=$(curl -s -X POST http://localhost:3001/xapp \
  -H "Content-Type: application/json" \
  -d "{\"command\": \"$ESCAPED\"}")

if [ $? -ne 0 ]; then
  echo "Error: could not reach the desktop server"
  exit 1
fi

echo "Launched: $CMD"
