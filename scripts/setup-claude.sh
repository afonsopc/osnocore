#!/bin/bash

MAX_RETRIES=5
RETRY_DELAY=5

FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

spin() {
  local msg="$1"
  local pid="$2"
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${FRAMES[$((i % ${#FRAMES[@]}))]} %s" "$msg"
    i=$((i + 1))
    sleep 0.1
  done
  printf "\r                                          \r"
}

watch_for_oauth() {
  local logfile="$1"
  local opened=""
  while true; do
    if [ -f "$logfile" ]; then
      URL=$(sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' "$logfile" 2>/dev/null | tr -d '\r\n' | grep -oE 'https://claude\.ai/oauth/authorize[^ "'"'"'<>)\]]+' | head -1)
      if [ -n "$URL" ] && [ "$URL" != "$opened" ]; then
        opened="$URL"
        /app/scripts/open-browser.sh "$URL"
      fi
    fi
    sleep 1
  done
}

run_setup_token() {
  local OAUTH_LOG="/tmp/.claude-auth-log-$$"
  rm -f "$OAUTH_LOG"

  watch_for_oauth "$OAUTH_LOG" &
  local WATCH_PID=$!

  script -qf "$OAUTH_LOG" -c 'echo "/exit" | claude'

  kill $WATCH_PID 2>/dev/null
  wait $WATCH_PID 2>/dev/null
  rm -f "$OAUTH_LOG"
}

echo ""
echo "  ┌─────────────────────────────────┐"
echo "  │     Claude Code Installer       │"
echo "  └─────────────────────────────────┘"
echo ""

for i in $(seq 1 $MAX_RETRIES); do
  (curl -fsSL https://claude.ai/install.sh -o /tmp/.claude-install.sh 2>/dev/null && bash /tmp/.claude-install.sh > /tmp/.claude-install-log 2>&1) &
  PID=$!
  spin "Downloading Claude Code" $PID

  FOUND=""
  if wait $PID 2>/dev/null && command -v claude > /dev/null 2>&1; then
    FOUND=1
  elif [ -f "$HOME/.local/bin/claude" ]; then
    export PATH="$HOME/.local/bin:$PATH"
    FOUND=1
  fi

  if [ -n "$FOUND" ]; then
    echo "  ✓ Claude Code installed"
    echo ""
    run_setup_token
    echo DONE > /tmp/setup-claude
    exit 0
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    for s in $(seq $RETRY_DELAY -1 1); do
      printf "\r  ○ Preparing download... %ds " "$s"
      sleep 1
    done
    printf "\r                              \r"
  fi
done

echo "  ✗ Could not install Claude Code. Please try again later."
echo FAIL > /tmp/setup-claude
exit 1
