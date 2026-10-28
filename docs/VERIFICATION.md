# Verification

The test suite uses temporary homes and controlled executables. It covers dependency ordering and deduplication, failures and resume, unsupported platforms, state permissions, concurrent operation locks, local-only status, suppressed probe output, unknown auth results, write-free dry runs, malformed input, shell preservation and idempotence, safe argument handling, skill targets, generator boundaries and symlinked CLI launchers.

Bootstrap tests simulate macOS and Linux downloads, including machines without Node, checksum rejection, unusual installation paths, repeat installation and refusal to overwrite another executable. These fixtures do not establish compatibility of real upstream binaries with every OS.

The CI matrix runs the suite on actual GitHub-hosted macOS and Ubuntu runners with Node 22.20 and 24. Gitleaks scans the Git history. Consult the latest [Actions run](https://github.com/rahulretnan/set-my-vibe/actions) for the current result.

Before the initial release, the catalog's npm package names/binaries and Homebrew formula/cask names were checked against publisher registries. Public skill source repositories were checked without credentials. Upstream install and generator documentation informed the commands. No catalog-wide installation, provider login, cloud resource provisioning or deployment was performed on the source Mac.

Release smoke tests use the public downloaded bootstrap in a temporary prefix with `--no-setup`, then run CLI version, plan and status. They do not alter normal shell files or install the selected developer tools. Maintainers should record new clean-machine trials with OS/architecture, selected tools, actual install outcomes and remaining manual steps instead of claiming universal support from mocked tests.
