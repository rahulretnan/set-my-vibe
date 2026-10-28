# Set My Vibe

### Your tools. Your AI skills. A workstation ready to build.

Set My Vibe (`smv`) is an open-source CLI for setting up a development environment on macOS and Linux. Choose your tools, install public AI skills, track unfinished configuration, and start projects with established generators.

[![CI](https://github.com/rahulretnan/set-my-vibe/actions/workflows/ci.yml/badge.svg)](https://github.com/rahulretnan/set-my-vibe/actions/workflows/ci.yml)
[![Release smoke](https://github.com/rahulretnan/set-my-vibe/actions/workflows/release-smoke.yml/badge.svg)](https://github.com/rahulretnan/set-my-vibe/actions/workflows/release-smoke.yml)
[![Release](https://img.shields.io/github/v/release/rahulretnan/set-my-vibe)](https://github.com/rahulretnan/set-my-vibe/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Quick start](#quick-start) · [Tools](#choose-your-tools) · [AI skills](#install-ai-skills) · [Projects](#start-a-project) · [Documentation](#documentation)

## What it does

- **Selectable setup.** Install individual tools or choose from six profiles. Preview commands before running them.
- **Configuration tracking.** See which tools still need login, shell integration, SDKs or manual setup.
- **Resumable installation.** Skip available tools, retain failed attempts, and retry your saved selection.
- **Public AI skills.** Install named skills from their original repositories into the coding agents you choose.
- **Project starters.** Use shadcn, Better-T-Stack, Cloudflare, Next.js and Expo, with additional Neon and Upstash setup guides.
- **Portable selections.** Export tool and skill choices without copying credentials or personal dotfiles.

The catalog includes **77 developer tools, 55 public skills, 6 profiles and 7 project recipes**. Browse the [complete catalog](docs/CATALOG.md) for installation methods and sources.

## Quick start

```sh
curl -fsSL https://raw.githubusercontent.com/rahulretnan/set-my-vibe/v0.1.1/install.sh | bash
```

The installer adds `smv` and opens an interactive selector when a terminal is available. Choose tool IDs, numbers or a profile, review the plan, then confirm installation.

```sh
smv setup
smv status
```

If `smv` is not on your PATH:

```sh
export PATH="$HOME/.local/bin:$PATH"
smv configure shell
```

`set-my-vibe` remains available as an equivalent command. Both names use the same configuration and state.

**Requirements:** Bash, curl, tar, awk and a SHA-256 utility. The installer uses Node.js 22.20+ when available, otherwise downloads a private Node 24 LTS runtime. Git, npm and Homebrew are not required before bootstrap. Run as your regular user, without `sudo`.

<details>
<summary>Review the installer first, or update without opening setup</summary>

```sh
curl -fsSL https://raw.githubusercontent.com/rahulretnan/set-my-vibe/v0.1.1/install.sh -o install-set-my-vibe.sh
less install-set-my-vibe.sh
bash install-set-my-vibe.sh --no-setup
```

See the [usage reference](docs/USAGE.md#quick-start) for custom installation paths and running from source. Releases are distributed through GitHub; an npm publication is not assumed.

</details>

## Choose your tools

Browse the catalog, inspect a plan, and install only what you need:

```sh
smv list --group ai
smv plan --profile web
smv install --profile web

# Or choose individual tools
smv install bun pnpm go rust uv claude codex
```

Available profiles:

- `minimal`: Git, Bun, GitHub CLI, ripgrep and direnv.
- `web`: JavaScript tooling, envx, Claude Code, Codex and skills.sh.
- `cloudflare`: Git, Bun, Wrangler, Neon, Upstash and envx.
- `mobile`: Android tooling, Java, Expo EAS, device automation, Xcode and xtool.
- `ai`: Coding agents, skills.sh and browser automation.
- `full`: Every catalog tool, including entries requiring manual setup.

The catalog also covers NVM, Python, Docker, AWS CLI, Vercel, Supabase, PostgreSQL, developer editors and media utilities. Platform-specific installation paths are documented in the [catalog](docs/CATALOG.md).

```sh
# Preview without installing
smv install --profile cloudflare --dry-run --json

# Retry your saved selection
smv resume
```

Dependencies are installed in order. Existing tools are skipped rather than upgraded. `--yes` skips the CLI confirmation; upstream installers may still request permissions or other input. Tool selection does not automatically install skills, log into services or create cloud resources.

## Know what still needs setup

```sh
smv status
smv status gh aws docker codex
smv status --verify
```

Normal status checks are local. They distinguish tool availability from pending configuration. `--verify` runs the supported account or service checks, suppressing their account output.

Manual steps can be acknowledged using the IDs shown by `status`:

```sh
smv mark git identity
smv mark git identity --undo
```

Acknowledged steps are labeled `user-confirmed`. Successful live checks are labeled `verified`. Installation detection alone does not establish that a tool is fully configured.

Use `smv status --json` for automation. See [status semantics and exit codes](docs/USAGE.md#see-unfinished-setup) for details.

## Install AI skills

Choose public skills and the agents that should receive them:

```sh
smv skills list
smv skills plan envx agent-browser --agents codex,claude-code
smv skills install envx agent-browser --agents codex,claude-code
smv skills install --group design --agents cursor
smv skills status
```

Supported targets are `codex`, `claude-code`, `cursor`, `gemini-cli` and `antigravity`. The default targets are Codex and Claude Code. Skill groups include general development, design, video and cmux.

Skills are installed through skills.sh from their original public repositories. Their licenses and trust requirements still apply. Private rules, personal memories, local hooks and plugin-managed skills are excluded from automatic migration. See [inventory scope](docs/INVENTORY.md).

### Use Set My Vibe with your AI agent

This repository includes a skill for guiding workstation setup and project bootstrap:

```sh
npx skills@latest add rahulretnan/set-my-vibe --skill set-my-vibe --global --agent codex claude-code
```

Example request:

> Use Set My Vibe to inspect my setup, propose the tools needed for a Cloudflare app with Neon, and identify the configuration still required before development.

The [workflow skill](skills/set-my-vibe/SKILL.md) helps an agent use CLI evidence and follow up on missing work. It does not grant permission to deploy, create paid resources or copy credentials.

## Start a project

Preview a recipe, then use `--run` to execute its upstream generator:

```sh
smv project better-t-stack my-app
smv project better-t-stack my-app --run

smv project cloudflare my-worker --run
smv project neon my-saas --run
smv project upstash my-service --run
smv project next my-site --run
smv project expo my-mobile-app --run

# Add shadcn/ui to an existing project
smv project shadcn --cwd ./my-site --run
```

Bun is required. New-project recipes require an unused directory name. The Cloudflare recipe disables initial deployment. Neon and Upstash recipes generate a Better-T-Stack app with a service-specific setup guide; application integration still needs implementation and verification.

New projects receive `VIBE-SETUP.md` after successful generation. It lists remaining configuration and checks for persistence, authorization, secrets, recovery, observability and deployment.

```sh
smv project check --cwd ./my-app
```

This reports available check scripts and CI-directory presence. Production readiness requires project-specific tests and real user-journey evidence. Follow the [production checklist](docs/PRODUCTION.md) before shipping.

## Bring your setup to another machine

```sh
# Export your saved choices
smv export > vibe-intent.json

# Preview and restore them on another machine
smv install --from vibe-intent.json --dry-run
smv install --from vibe-intent.json
smv skills install --from vibe-intent.json
```

Skip the skill restore command if your export contains no selected skills. Use `smv export --detected` to export the catalog tools detected locally instead of the saved tool selection.

Exports contain tool IDs, skill IDs and agent names. They do not contain credentials, account IDs, environment values or personal paths. They record installation choices, not locked versions or a complete machine backup.

## Platform support

The CLI targets macOS on Apple Silicon and Intel, and Linux on x86_64 and arm64 with a compatible Node runtime. System package installation uses Homebrew, including on supported Linux distributions.

Xcode is macOS-only. Android SDKs, simulator images, signing, licenses and some Linux desktop applications require manual setup. Unsupported entries remain visible in status. Native Windows, 32-bit systems and Alpine/musl are not bootstrap targets; compatible WSL2 distributions may be used with their own GUI and device limitations.

See the [platform reference](docs/USAGE.md#platform-support) for component-specific requirements.

## Security and privacy

Set My Vibe does not export credentials, read shell history or copy personal agent configuration. Shell integration is opt-in and preserves existing file content. The CLI implements no telemetry; third-party tools may have their own policies.

The bootstrap verifies downloaded archives using publisher-provided SHA-256 files. These checks detect corruption, not a compromised publisher. Upstream installers, packages, generators and skills execute code under their own trust boundaries. Review the selected commands and sources before running them.

Read the [security policy](SECURITY.md) for credential handling, trust boundaries and vulnerability reporting.

## Documentation

- [Usage reference](docs/USAGE.md): installation, command behavior, shell setup, updates, uninstall and troubleshooting.
- [Tool and skill catalog](docs/CATALOG.md): supported entries and upstream sources.
- [Inventory scope](docs/INVENTORY.md): what the catalog includes and excludes.
- [Production checklist](docs/PRODUCTION.md): evidence to gather before deploying an application.
- [Verification](docs/VERIFICATION.md): test coverage and its limits.
- [AI workflow skill](skills/set-my-vibe/SKILL.md): instructions for coding agents.

## Contributing

Contributions to tool coverage, platform support, skill sources, documentation and tests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

The CLI has no third-party runtime dependencies. With Node.js 22.20+ installed, run:

```sh
npm run check
npm test
npm run audit:public
```

CI covers macOS and Ubuntu with Node 22.20 and 24, plus secret scanning. Release smoke tests exercise the public installer and an isolated package installation. This coverage does not establish compatibility for every tool on every machine.

## License

[MIT](LICENSE) © Rahul Retnan. Installed tools and third-party skills retain their own licenses.
