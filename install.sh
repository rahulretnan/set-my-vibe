#!/usr/bin/env bash
# Bootstrap set-my-vibe without requiring Node, npm, Homebrew, or Git.
set -euo pipefail
VERSION=v0.1.0
PREFIX="${SET_MY_VIBE_HOME:-$HOME/.local/share/set-my-vibe}"
BIN_DIR="$HOME/.local/bin"
NO_SETUP=0
usage() { echo 'Usage: bash install.sh [--version vX.Y.Z] [--prefix DIRECTORY] [--no-setup]'; }
while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) [ "$#" -ge 2 ] || { usage; exit 2; }; VERSION="$2"; shift 2 ;;
    --prefix) [ "$#" -ge 2 ] || { usage; exit 2; }; PREFIX="$2"; BIN_DIR="$PREFIX/bin"; shift 2 ;;
    --no-setup) NO_SETUP=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Invalid release version.' >&2; exit 2; }
case "$PREFIX" in /*) ;; *) echo '--prefix must be an absolute path.' >&2; exit 2;; esac
case "$PREFIX$BIN_DIR" in *$'\n'*|*$'\r'*) echo 'Paths cannot contain newlines.' >&2; exit 2;; esac
[ "$(id -u)" -ne 0 ] || { echo 'Run as your regular user, without sudo.' >&2; exit 1; }
case "$(uname -s)" in Darwin) PLATFORM=darwin;; Linux) PLATFORM=linux;; *) echo 'Requires macOS or Linux.' >&2; exit 1;; esac
case "$(uname -m)" in arm64|aarch64) ARCH=arm64;; x86_64|amd64) ARCH=x64;; *) echo 'Requires arm64 or x86_64.' >&2; exit 1;; esac
for tool in curl tar awk mktemp; do command -v "$tool" >/dev/null || { echo "Install $tool first." >&2; exit 1; }; done
if command -v sha256sum >/dev/null; then HASH=sha256sum
elif command -v shasum >/dev/null; then HASH=shasum
else echo 'Install sha256sum or shasum first.' >&2; exit 1; fi
fetch() { curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --connect-timeout 15 --max-time 300 "$1" -o "$2"; }
check_hash() {
  local actual
  if [ "$HASH" = sha256sum ]; then actual=$(sha256sum "$1" | awk '{print $1}'); else actual=$(shasum -a 256 "$1" | awk '{print $1}'); fi
  [ "$actual" = "$2" ] || { echo 'Checksum mismatch. Stopping before execution.' >&2; exit 1; }
}
TMP=$(mktemp -d)
LOCK=''
cleanup() { rm -rf "$TMP"; if [ -n "$LOCK" ]; then rmdir "$LOCK" 2>/dev/null || true; fi; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p "$PREFIX" "$BIN_DIR"
mkdir "$PREFIX/bootstrap.lock" 2>/dev/null || { echo 'Another bootstrap is active. Inspect bootstrap.lock if an earlier run crashed.' >&2; exit 1; }
LOCK="$PREFIX/bootstrap.lock"
NODE=''
if command -v node >/dev/null && node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=20)?0:1)' 2>/dev/null; then NODE=$(command -v node)
elif [ -x "$PREFIX/runtime/bin/node" ] && "$PREFIX/runtime/bin/node" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=20)?0:1)' 2>/dev/null; then NODE="$PREFIX/runtime/bin/node"
else
  echo 'Downloading a private Node.js 24 LTS runtime (system Node is unchanged).'
  fetch 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' "$TMP/node-sums"
  NODE_FILE=$(awk -v suffix="-$PLATFORM-$ARCH.tar.gz" 'length($2)>length(suffix) && substr($2,length($2)-length(suffix)+1)==suffix {print $2; exit}' "$TMP/node-sums")
  [[ "$NODE_FILE" =~ ^node-v24\.[0-9]+\.[0-9]+-(darwin|linux)-(arm64|x64)\.tar\.gz$ ]] || { echo 'No supported Node runtime found.' >&2; exit 1; }
  NODE_VERSION=${NODE_FILE#node-}; NODE_VERSION=${NODE_VERSION%%-$PLATFORM-*}
  NODE_SHA=$(awk -v file="$NODE_FILE" '$2==file {print $1}' "$TMP/node-sums")
  fetch "https://nodejs.org/dist/$NODE_VERSION/$NODE_FILE" "$TMP/node.tar.gz"
  check_hash "$TMP/node.tar.gz" "$NODE_SHA"
  mkdir "$TMP/runtime"
  tar -xzf "$TMP/node.tar.gz" -C "$TMP/runtime" --strip-components=1
  "$TMP/runtime/bin/node" --version
  [ ! -e "$PREFIX/runtime" ] || { echo 'Existing unusable private runtime; inspect it before reinstalling.' >&2; exit 1; }
  mv "$TMP/runtime" "$PREFIX/runtime"
  NODE="$PREFIX/runtime/bin/node"
fi
BASE="https://github.com/rahulretnan/set-my-vibe/releases/download/$VERSION"
fetch "$BASE/set-my-vibe.tar.gz" "$TMP/app.tar.gz"
fetch "$BASE/SHA256SUMS" "$TMP/app-sums"
APP_SHA=$(awk '$2=="set-my-vibe.tar.gz" {print $1}' "$TMP/app-sums")
[[ "$APP_SHA" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid release checksum.' >&2; exit 1; }
check_hash "$TMP/app.tar.gz" "$APP_SHA"
# Release archives are expected to have relative paths rooted in set-my-vibe/.
tar -tzf "$TMP/app.tar.gz" > "$TMP/files"
if ! awk 'BEGIN{ok=1} $0 !~ /^set-my-vibe\// || $0 ~ /(^|\/)\.\.(\/|$)/ {ok=0} END{exit !ok}' "$TMP/files"; then echo 'Unsafe archive paths.' >&2; exit 1; fi
mkdir "$TMP/app"
tar -xzf "$TMP/app.tar.gz" -C "$TMP/app" --strip-components=1
[ -f "$TMP/app/bin/set-my-vibe.mjs" ] || { echo 'Incomplete release.' >&2; exit 1; }
# Validate the release before switching the launcher.
CLI_VERSION=$("$NODE" "$TMP/app/bin/set-my-vibe.mjs" --version)
[ "$CLI_VERSION" = "${VERSION#v}" ] || { echo 'Release version does not match requested version.' >&2; exit 1; }
mkdir -p "$PREFIX/releases"
DEST="$PREFIX/releases/$VERSION"
if [ -e "$DEST" ]; then
  # Same release is immutable; retain existing files and verify their CLI is usable.
  "$NODE" "$DEST/bin/set-my-vibe.mjs" --version >/dev/null
else mv "$TMP/app" "$DEST"; fi
LAUNCHER="$BIN_DIR/set-my-vibe"
if [ -e "$LAUNCHER" ] || [ -L "$LAUNCHER" ]; then
  if ! head -n 3 "$LAUNCHER" | awk '/# set-my-vibe managed launcher/{found=1} END{exit !found}'; then echo 'Refusing to overwrite an unrelated set-my-vibe executable.' >&2; exit 1; fi
fi
# Node writes the wrapper with correct shell quoting even for spaces/apostrophes.
"$NODE" --input-type=module - "$PREFIX" "$NODE" "$DEST" "$LAUNCHER" <<'JS'
import fs from 'node:fs';
const [prefix,node,dest,launcher]=process.argv.slice(2);
const q=s=>"'"+s.replaceAll("'","'\\''")+"'";
const content=`#!/usr/bin/env bash\n# set-my-vibe managed launcher\nexport SET_MY_VIBE_HOME=${q(prefix)}\nexport PATH=${q(node.slice(0,node.lastIndexOf('/')))}:"$PATH"\nexec ${q(node)} ${q(dest+'/bin/set-my-vibe.mjs')} "$@"\n`;
fs.writeFileSync(launcher+'.tmp',content,{mode:0o755});fs.renameSync(launcher+'.tmp',launcher);
JS
echo "Installed $LAUNCHER"
echo "Add $BIN_DIR to PATH, or use the full path above."
echo 'Run set-my-vibe configure shell to opt into shell hooks.'
if [ "$NO_SETUP" -eq 0 ] && [ -t 1 ] && ( : </dev/tty ) 2>/dev/null; then
  "$LAUNCHER" setup </dev/tty
else echo 'Run set-my-vibe setup when ready to select tools.'; fi
