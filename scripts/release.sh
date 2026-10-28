#!/usr/bin/env bash
set -euo pipefail
# Build from committed files only. Does not publish or tag.
[ -z "$(git status --porcelain)" ] || { echo 'Commit or stash work before packaging.' >&2; exit 1; }
mkdir -p dist
git archive --format=tar --prefix=set-my-vibe/ HEAD | gzip -n > dist/set-my-vibe.tar.gz
(cd dist && if command -v sha256sum >/dev/null; then sha256sum set-my-vibe.tar.gz; else shasum -a 256 set-my-vibe.tar.gz; fi) > dist/SHA256SUMS
printf '%s\n' 'Created dist/set-my-vibe.tar.gz and dist/SHA256SUMS'
