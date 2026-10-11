#!/usr/bin/env bash
# Downloads node_modules built by the `deps` workflow for the current
# pnpm-lock.yaml and unpacks it into the repo.
#
# Only needed in environments without npm registry access (like the cloud
# session this project is built in). With registry access, run `pnpm install`.
set -euo pipefail
cd "$(dirname "$0")/.."
repo="${GITHUB_REPOSITORY:-Daxitampooo/All-in-Academy}"
hash=$(sha256sum pnpm-lock.yaml | cut -c1-12)
tag="deps-$hash"
stamp="node_modules/.deps-tag"
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$tag" ]; then
  echo "Dependencies already match $tag"
  exit 0
fi
asset=$(gh api "repos/$repo/releases/tags/$tag" --jq '.assets[] | select(.name=="deps-linux-x64.tgz") | .id') || {
  echo "No dependency archive for $tag yet. Push package.json/pnpm-lock.yaml changes and wait for the 'deps' workflow." >&2
  exit 1
}
tmp=$(mktemp -d)
gh api -H 'Accept: application/octet-stream' "repos/$repo/releases/assets/$asset" > "$tmp/deps.tgz"
rm -rf node_modules apps/*/node_modules packages/*/node_modules
tar -xzf "$tmp/deps.tgz"
rm -rf "$tmp"
echo "$tag" > "$stamp"
echo "Installed dependencies from $tag"
