# Contributing

Requires Node.js 22.20+ and Bash. No npm install is needed; the CLI has no runtime or development dependencies.

```sh
npm run check
npm test
npm run audit:public
bash -n install.sh scripts/release.sh
```

Add tools to `catalog/tools.json`, profiles to `catalog/profiles.json`, public skill references to `catalog/skills.json`, and generator recipes to `catalog/recipes.json`. Each tool needs an ID, platform list, detection rule, upstream documentation and an installation or manual path. Setup steps must distinguish checks from manual confirmations. Verify package names and binaries against the current upstream source. Use a manual step when you cannot establish a supported install path.

Keep execution as argument arrays. Do not add eval, interpolated shell commands, arbitrary hooks from imported manifests, credential scraping, or a generic secret-export feature. Treat dependency failures and platform limitations as visible states. Avoid silently starting services, accepting licenses, changing user groups, creating cloud resources or upgrading already installed tools.

Add behavior tests with isolated temporary homes and fake executables. Never make the test suite install a real tool, authenticate an account, alter the developer's shell, or create billed resources. Bootstrap tests stub downloads and also exercise the no-Node path and checksum failure. CI runs on macOS/Linux with Node 22.20 and 24. Actual fresh-machine install coverage must be identified separately.

Public skills are references to upstream repositories, not copies under our license. Verify public access and intended source before adding one. Do not import personal hooks, private repositories, remembered task context or plugin caches.

Release maintainers: update package/CLI/bootstrap versions together, run checks, commit, run `bash scripts/release.sh`, then publish the archive and SHA256SUMS on the matching GitHub release. Release assets are immutable; ship a new version for changes. Smoke-test the downloaded bootstrap in a temporary prefix with `--no-setup`. Publishing npm is a separate action and is not implied by a GitHub release.
