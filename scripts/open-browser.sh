#!/bin/sh
case "$1" in
  *localhost*) exit 0 ;;
esac

URL=$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')
curl -s -X POST "http://127.0.0.1:3001/open" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\"}" > /dev/null 2>&1 &
