#!/usr/bin/env bash
# Serve ../web on :8080 and start Expo, pointing the WebView at that copy.
# Use this on a computer on the same Wi-Fi as the phone.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -z "${IP}" ]]; then
  IP="$(ip -4 addr show 2>/dev/null | awk '/inet / && $2 !~ /^127/ {print $2}' | head -1 | cut -d/ -f1)"
fi
if [[ -z "${IP}" ]]; then
  IP="127.0.0.1"
fi
export EXPO_PUBLIC_TABLE_URL="${EXPO_PUBLIC_TABLE_URL:-http://${IP}:8080}"
echo "Web table: ${EXPO_PUBLIC_TABLE_URL}/?native=1"
echo "Keep this terminal open. In Expo Go, scan the QR from the next command."
(cd "${ROOT}/web" && python3 -m http.server 8080) &
WEB_PID=$!
trap 'kill ${WEB_PID} 2>/dev/null || true' EXIT
cd "${ROOT}/expo"
npx expo start --tunnel "$@"
