#!/bin/bash
# Scans .desktop files and creates xwrap shims in ~/.local/bin/ for each GUI app.
# Runs at container start and after every apt install (via apt hook).

SHIM_DIR="$HOME/.local/bin"
XWRAP_SRC="/app/scripts/xwrap.sh"
PROTECTED="xlaunch sudo xwrap-refresh"

mkdir -p "$SHIM_DIR"

created=0

for desktop in /usr/share/applications/*.desktop; do
  [ -f "$desktop" ] || continue

  # Extract the Exec line value
  exec_line="$(grep -m1 '^Exec=' "$desktop" | cut -d= -f2-)"
  [ -z "$exec_line" ] && continue

  # Strip leading env VAR=val prefixes
  bin="$exec_line"
  while [[ "$bin" == env\ * ]] || [[ "$bin" == *=*\ * ]]; do
    bin="${bin#env }"
    [[ "$bin" == *=*\ * ]] && bin="${bin#*= }" || break
  done

  # Take just the first token (the binary), strip field codes like %U %F etc
  bin="${bin%% *}"

  # If it's a full path, take the basename
  bin="$(basename "$bin")"

  # Skip empty, protected names, or if shim already exists
  [ -z "$bin" ] && continue
  echo "$PROTECTED" | grep -qw "$bin" && continue
  [ -f "$SHIM_DIR/$bin" ] && continue

  # Verify the real system binary exists somewhere outside our shim dir
  real=""
  IFS=: read -ra DIRS <<< "$PATH"
  for dir in "${DIRS[@]}"; do
    [ "$dir" = "$SHIM_DIR" ] && continue
    [ -x "$dir/$bin" ] && { real="$dir/$bin"; break; }
  done
  [ -z "$real" ] && continue

  cp "$XWRAP_SRC" "$SHIM_DIR/$bin"
  chmod +x "$SHIM_DIR/$bin"
  created=$((created + 1))
done

if [ "$created" -gt 0 ]; then
  echo "xwrap-refresh: created $created shim(s)"
else
  echo "xwrap-refresh: no new shims needed"
fi
