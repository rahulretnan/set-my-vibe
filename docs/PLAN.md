# Implementation plan

Scope: MIT-licensed developer setup CLI for macOS and Linux, based on a metadata-only workstation inventory. Exclude everyday desktop apps, private projects, credential material, personal dotfiles, and superdev.

1. Inventory package names, developer apps, executable availability and public skill source metadata. Verify sources against upstream documentation.
2. Implement a dependency-free Node CLI and Bash bootstrap. Bootstrap a private Node runtime only when required. Tool selection, profiles, dry-run plan, ordered dependencies, resume, machine-readable status, and explicit configuration actions.
3. Keep tools in a declarative catalog. Prefer maintained upstream installers and Homebrew. Unsupported platform or installer paths must remain explicit manual steps, never false successes.
4. Track installation separately from authentication, shell integration, SDKs and project setup. Default checks are local. Optional account checks suppress account details. Record only IDs and result states.
5. Install individually selected public skills through skills.sh for selected agents. Do not copy installed skill contents or private/custom agent configuration. Preserve source attribution and licenses.
6. Wrap upstream project generators with reviewed plans and safe path validation. Add Cloudflare, Neon and Upstash handoff recipes and an honest production-readiness checklist. No automatic deployment, paid resource provisioning or credential transfer.
7. Test behavior with isolated homes and fake executables, macOS/Linux CI, public-content checks and shell bootstrap verification. Do not install the catalog on the source workstation.
8. Create the public GitHub repository and release, verify downloadable artifacts and bootstrap with an isolated installation prefix.

Acceptance: selecting tools produces a reproducible intent list; repeat runs skip installed tools; failures stay visible; dry runs do not write; shell configuration is opt-in and idempotent; status distinguishes installed, missing, unsupported, pending and user-confirmed; all external command arguments are passed without shell interpolation; no source-machine paths or credential values appear in public files.

Limits: upstream installers and skill content can change; a selected stack requires project-specific security, permissions, tests, deployment and recovery verification. Hardware SDKs and licenses need user action. Clean-machine integration coverage is recorded separately from mocked tests.
