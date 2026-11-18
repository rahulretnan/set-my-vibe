#!/usr/bin/env bash
set -euo pipefail
# Build from committed files only. Does not publish or tag.
[ -z "$(git status --porcelain)" ] || { echo 'Commit or stash work before packaging.' >&2; exit 1; }
mkdir -p dist
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
git archive --format=tar --prefix=set-my-vibe/ HEAD | tar -xf - -C "$staging"
# Run npm from the staged project so it resolves that project and lockfile.
(cd "$staging/set-my-vibe" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
# BSD tar can emit AppleDouble files and extended attributes on macOS.
COPYFILE_DISABLE=1 tar --no-xattrs -C "$staging" -cf - set-my-vibe | gzip -n > "$staging/release.tar.gz"
tar -tzf "$staging/release.tar.gz" > "$staging/entries"
if ! awk '$0 !~ /^set-my-vibe\// || $0 ~ /(^|\/)\.\.(\/|$)/ || $0 ~ /(^|\/)\._/ {bad=1; print "Invalid archive entry: " $0 > "/dev/stderr"} END {exit bad || NR==0}' "$staging/entries"; then
  exit 1
fi
mv "$staging/release.tar.gz" dist/set-my-vibe.tar.gz
(cd dist && if command -v sha256sum >/dev/null; then sha256sum set-my-vibe.tar.gz; else shasum -a 256 set-my-vibe.tar.gz; fi) > dist/SHA256SUMS
printf '%s\n' 'Created dist/set-my-vibe.tar.gz and dist/SHA256SUMS'
