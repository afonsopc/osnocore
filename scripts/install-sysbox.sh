#!/bin/bash
set -e

echo "Installing Sysbox container runtime..."

ARCH=$(dpkg --print-architecture)
SYSBOX_VERSION=$(curl -s https://api.github.com/repos/nestybox/sysbox/releases/latest | grep tag_name | cut -d'"' -f4)
echo "Version: $SYSBOX_VERSION ($ARCH)"

wget -q "https://downloads.nestybox.com/sysbox/releases/${SYSBOX_VERSION}/sysbox-ce_${SYSBOX_VERSION#v}-0.linux_${ARCH}.deb" -O /tmp/sysbox.deb
sudo apt-get install -y /tmp/sysbox.deb
rm /tmp/sysbox.deb

echo ""
echo "Sysbox installed:"
sysbox-runc --version

echo ""
echo "Docker is now configured to use sysbox-runc."
echo "Run: docker compose --profile prod up"
