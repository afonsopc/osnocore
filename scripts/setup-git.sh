#!/bin/bash

echo ""
echo "  ┌─────────────────────────────────┐"
echo "  │       Git Configuration         │"
echo "  └─────────────────────────────────┘"
echo ""

CURRENT_NAME=$(git config --global user.name 2>/dev/null || true)
CURRENT_EMAIL=$(git config --global user.email 2>/dev/null || true)

if [ -n "$CURRENT_NAME" ]; then
  echo "  Current name: $CURRENT_NAME"
fi
echo -n "  Enter your name: "
read NAME
if [ -z "$NAME" ] && [ -n "$CURRENT_NAME" ]; then
  NAME="$CURRENT_NAME"
fi

if [ -z "$NAME" ]; then
  echo "  ✗ Name cannot be empty"
  echo FAIL > /tmp/setup-git
  exit 1
fi

git config --global user.name "$NAME"

echo ""
if [ -n "$CURRENT_EMAIL" ]; then
  echo "  Current email: $CURRENT_EMAIL"
fi
echo -n "  Enter your email: "
read EMAIL
if [ -z "$EMAIL" ] && [ -n "$CURRENT_EMAIL" ]; then
  EMAIL="$CURRENT_EMAIL"
fi

if [ -z "$EMAIL" ]; then
  echo "  ✗ Email cannot be empty"
  echo FAIL > /tmp/setup-git
  exit 1
fi

git config --global user.email "$EMAIL"

echo ""
echo "  ┌──────────────────────────────────────────┐"
echo "    Name:  $NAME"
echo "    Email: $EMAIL"
echo "  └──────────────────────────────────────────┘"
echo ""
echo "  ✓ Git configured"
echo ""
echo DONE > /tmp/setup-git
