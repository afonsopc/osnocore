#!/bin/bash

echo ""
echo "  ┌─────────────────────────────────┐"
echo "  │        SSH Key Setup            │"
echo "  └─────────────────────────────────┘"
echo ""

if [ -f ~/.ssh/id_ed25519.pub ]; then
  echo "  ✓ Existing key found:"
  echo ""
  echo "    $(cat ~/.ssh/id_ed25519.pub)"
  echo ""
  echo -n "  Replace it? (y/N) "
  read REPLY
  if [ "$REPLY" != "y" ]; then
    echo ""
    echo "  ✓ Keeping existing key"
    echo DONE > /tmp/setup-ssh
    exit 0
  fi
  echo ""
fi

echo "  What would you like to do?"
echo ""
echo "    1) Generate a new SSH key"
echo "    2) Paste an existing private key"
echo ""
echo -n "  Choice (1/2): "
read CHOICE

echo ""
mkdir -p ~/.ssh
chmod 700 ~/.ssh

case "$CHOICE" in
  2)
    echo "  Paste your private key below, then press Enter and Ctrl+D:"
    echo ""
    cat > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    if ssh-keygen -y -f ~/.ssh/id_ed25519 > ~/.ssh/id_ed25519.pub 2>/dev/null; then
      echo ""
      echo "  ✓ Key imported! Public key:"
      echo ""
      echo "  ┌──────────────────────────────────────────┐"
      echo "    $(cat ~/.ssh/id_ed25519.pub)"
      echo "  └──────────────────────────────────────────┘"
      echo ""
      echo DONE > /tmp/setup-ssh
    else
      echo "  ✗ Invalid private key"
      echo FAIL > /tmp/setup-ssh
      exit 1
    fi
    ;;
  *)
    if ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ''; then
      echo ""
      echo "  ✓ Key generated! Here's your public key:"
      echo ""
      echo "  ┌──────────────────────────────────────────┐"
      echo "    $(cat ~/.ssh/id_ed25519.pub)"
      echo "  └──────────────────────────────────────────┘"
      echo ""
      echo "  Add it to GitHub → Settings → SSH Keys"
      echo ""
      echo DONE > /tmp/setup-ssh
    else
      echo FAIL > /tmp/setup-ssh
      exit 1
    fi
    ;;
esac
