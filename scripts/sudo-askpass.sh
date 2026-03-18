#!/bin/sh

ID="askpass-$$-$(date +%s)"
PASSFILE="/tmp/$ID"

curl -s -X POST "http://127.0.0.1:3001/askpass" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$ID\", \"prompt\": \"$1\"}" > /dev/null 2>&1

TRIES=0
while [ ! -f "$PASSFILE" ] && [ $TRIES -lt 400 ]; do
  sleep 0.3
  TRIES=$((TRIES + 1))
done

if [ -f "$PASSFILE" ]; then
  PASS=$(cat "$PASSFILE")
  rm -f "$PASSFILE" 2>/dev/null
  if [ -n "$PASS" ]; then
    echo "$PASS"
    exit 0
  fi
fi

exit 1
