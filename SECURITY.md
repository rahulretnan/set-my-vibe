# Security

Never include credential values in issues or pull requests. Use GitHub private vulnerability reporting for this repository when available; otherwise contact the maintainer through the contact information on their GitHub profile before sending sensitive details.

The CLI does not read credential files, private keys, shell history, personal agent configuration or environment variable values for inventory/export. It stores selected IDs, install outcomes, skill targets and manual confirmations locally. Status verification runs a small allowlist of official commands, suppresses their output and reports only a state. It can contact providers and refresh their local auth state; it is opt-in.

Installing software necessarily executes upstream code. Homebrew, npm packages, remote installers, project generators and skills have their own trust and licensing requirements. Review `plan`, catalog source links and selected skills. Installed agents retain their own permission models. This CLI does not disable safety prompts or configure unrestricted agent execution.

The bootstrap uses HTTPS and validates SHA-256 before extracting Node and release archives. Checksums are downloaded from the same publisher; they detect corruption but are not an independent signature or protection from a compromised publisher. The bootstrap script itself is executable code, so review or pin it. Most upstream tool versions and skill contents float. An exported manifest records intent, not a hermetic lockfile.

No telemetry is implemented by this CLI. Skill installation sets `DISABLE_TELEMETRY=1`; other upstream installers, applications and generators may have their own telemetry. Third-party subprocess output is interactive and is not captured in our state, but may include provider messages. Do not paste sensitive installer output into public reports.

Run without sudo. Privileged operations belong to specific upstream installers. No automatic Docker group changes, license acceptance, cloud resource creation, deployment, dotfile copying, or credential migration is performed. Cloud resource creation can incur charges and belongs to a separate reviewed action.

Development checks: `npm run audit:public` and the CI Gitleaks job. The local pattern scan is supplementary, not a guarantee that arbitrary sensitive content can be detected.
