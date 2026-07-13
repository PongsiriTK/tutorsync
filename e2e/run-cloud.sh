#!/usr/bin/env bash
# Cloud-mode e2e: boots a fresh local backend, builds+serves a cloud-mode
# frontend against it, runs the cloud Playwright project, then tears down.
set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT=8791
WEB_PORT=4600
API_URL="http://localhost:${API_PORT}"
export TS_E2E_API="$API_URL"
export TS_BASE_URL="http://localhost:${WEB_PORT}"

cleanup() { kill ${API_PID:-} ${WEB_PID:-} 2>/dev/null || true; rm -f server/data/e2e-*.sqlite* 2>/dev/null || true; }
trap cleanup EXIT

echo "▶ starting backend on :${API_PORT}"
# Force the AI key OFF for e2e so /ai/chat returns 503 and the client exercises
# its deterministic local-heuristic fallback (no real GLM calls / token spend).
( cd server && MAXPLUS_API_KEY= TS_DB="./data/e2e-$(date +%s).sqlite" PORT=$API_PORT bun run src/index.js ) &
API_PID=$!
for i in $(seq 1 40); do curl -sf "$API_URL/health" >/dev/null 2>&1 && break; sleep 0.25; done

echo "▶ building cloud-mode frontend (VITE_API_URL=$API_URL)"
VITE_API_URL="$API_URL" npm run build >/dev/null

echo "▶ serving build on :${WEB_PORT}"
npx vite preview --port $WEB_PORT --strictPort >/dev/null 2>&1 &
WEB_PID=$!
for i in $(seq 1 40); do curl -sf "$TS_BASE_URL/" >/dev/null 2>&1 && break; sleep 0.25; done

echo "▶ running cloud e2e"
npx playwright test --project=cloud
