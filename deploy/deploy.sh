#!/usr/bin/env bash
# Build the frontend and publish it to the folder Caddy serves (see
# deploy/ in corven-backend-v2). Run on the server from this checkout:
#   bash deploy/deploy.sh             # pull latest code, build, publish
#   bash deploy/deploy.sh --no-pull   # build what is checked out
#
# Override the defaults with environment variables if needed:
#   VITE_API_URL, VITE_TERMINAL_URL, WEB_ROOT
set -euo pipefail

cd "$(dirname "$0")/.."

# Vite bakes these into the bundle at build time.
export VITE_API_URL="${VITE_API_URL:-https://staging-api.corvan.space/api}"
export VITE_TERMINAL_URL="${VITE_TERMINAL_URL:-https://staging-api.corvan.space}"
WEB_ROOT="${WEB_ROOT:-/opt/corven/web}"

if [ "${1:-}" != "--no-pull" ]; then
    echo "==> Pulling latest code"
    git pull --ff-only
fi

# Build in a throwaway Node container so the server needs only Docker.
echo "==> Building (API: $VITE_API_URL)"
docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -e VITE_API_URL \
    -e VITE_TERMINAL_URL \
    -v "$PWD":/app \
    -w /app \
    public.ecr.aws/docker/library/node:22-bookworm-slim \
    sh -c 'npx --yes pnpm@12.6.0 install --frozen-lockfile && npx --yes pnpm@12.6.0 exec vite build'

# Copy the hashed assets first and index.html last, so visitors never get an
# index.html that points at files that aren't there yet. Old assets are kept
# for tabs that are still open on the previous version.
echo "==> Publishing to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
for path in dist/*; do
    [ "$(basename "$path")" = index.html ] || cp -a "$path" "$WEB_ROOT"/
done
cp dist/index.html "$WEB_ROOT"/index.html.tmp
mv "$WEB_ROOT"/index.html.tmp "$WEB_ROOT"/index.html

echo "Done. Open https://corven.space"
