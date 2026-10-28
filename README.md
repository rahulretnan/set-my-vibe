# Set My Vibe

Set up a coding workstation with the tools you choose, then see what still needs login, shell configuration, SDK setup or project work.

Set My Vibe is an open-source CLI for macOS and Linux, built from a metadata-only inventory of a working developer Mac. It includes **77 tools, 55 public skills, 6 tool profiles and 7 project recipes**. It helps you get ready to build with AI and track the work needed to ship a production app.

MIT licensed. No runtime dependencies. No personal dotfiles or credentials included. Superdev and everyday desktop apps are excluded.

## Quick start

```sh
curl -fsSL https://raw.githubusercontent.com/rahulretnan/set-my-vibe/v0.1.0/install.sh | bash
```

This installs the CLI and opens a numbered tool selector when an interactive terminal is available. Choose tool numbers, IDs or a profile name, review the commands, then confirm. It does **not** install the whole catalog by default.

The bootstrap needs Bash, curl, tar, awk and a SHA-256 utility. It uses an existing Node.js 22.20+ or downloads a private Node 24 LTS runtime. It verifies downloaded archives against the publisher's SHA-256 file. It requires no existing npm, Git or Homebrew. Run as your regular user, without `sudo`.

The default command location is `~/.local/bin/set-my-vibe`. If it is not already on PATH:

```sh
export PATH="$HOME/.local/bin:$PATH"
set-my-vibe configure shell
```

For an inspect-first installation:

```sh
curl -fsSL https://raw.githubusercontent.com/rahulretnan/set-my-vibe/v0.1.0/install.sh -o install-set-my-vibe.sh
less install-set-my-vibe.sh
bash install-set-my-vibe.sh --no-setup
~/.local/bin/set-my-vibe plan --profile web
~/.local/bin/set-my-vibe install --profile web
```

Custom isolated location:

```sh
bash install-set-my-vibe.sh --prefix "$HOME/vibe-tools" --no-setup
"$HOME/vibe-tools/bin/set-my-vibe" list
```

This is a GitHub release. An npm registry publication is not required or assumed. To run from source:

```sh
git clone https://github.com/rahulretnan/set-my-vibe.git
cd set-my-vibe
node bin/set-my-vibe.mjs setup
```

## Choose what to install

```sh
set-my-vibe list
set-my-vibe list --group ai
set-my-vibe profiles
set-my-vibe plan bun pnpm go rust uv claude codex
set-my-vibe install bun pnpm go rust uv claude codex
set-my-vibe install --profile cloudflare --dry-run --json
set-my-vibe install --profile web --yes
set-my-vibe resume
```

Profiles:

| Profile | Purpose |
| --- | --- |
| `minimal` | Git, Bun, GitHub CLI, ripgrep and direnv |
| `web` | JavaScript tooling, envx, Claude Code, Codex and skills.sh |
| `cloudflare` | Bun, Wrangler, Neon, Upstash and envx |
| `mobile` | Android tooling, Java, Expo EAS, device automation, Xcode and xtool |
| `ai` | Claude Code, Codex, Cursor Agent, Antigravity, T3, Gemini, skills and browser automation |
| `full` | Every catalog entry; review platform limits and installation size first |

`--all` also selects every tool. Neither `full` nor `--all` means all skills, all agent targets, or automatic cloud setup. `--yes` skips this CLI's confirmation; upstream installers may still request sudo, interactive choices or license review.

Dependencies are ordered and deduplicated. Available tools are skipped. A failed dependency blocks its dependents; independent tools continue. The selection and outcomes are saved after each attempt. `resume` retries the saved selection. A successful installer without a detectable executable is reported as `needs-path`, not success.

Tool versions generally follow upstream stable/latest channels. Existing tools are not upgraded or replaced just because a newer version exists. Detection checks executable or application presence, not complete functionality or exact version parity. NVM and Node are separate choices; install NVM, configure the shell, then use `nvm install --lts` if you want NVM-managed project runtimes.

See [the complete tool catalog](docs/CATALOG.md) for IDs, installation methods and sources.

## See unfinished setup

```sh
set-my-vibe status
set-my-vibe status --all
set-my-vibe status gh aws docker codex
set-my-vibe status --verify
set-my-vibe status --json
```

`status` uses the saved selection, or the whole catalog before a selection exists. Installation and configuration are separate:

- `installed`, `missing`, `unsupported`: current local detection.
- `failed`, `blocked`, `manual`, `needs-path`: last installation attempt, where recorded.
- `pending`: setup is not yet verified or acknowledged.
- `verified`: a supported account/service probe succeeded during this invocation.
- `user-confirmed`: you explicitly marked a manual step complete.
- `unknown`: a probe timed out, errored or returned an unrecognized result.

Normal status is local and does not read credentials or make network requests. `--verify` opts into bounded probes for GitHub auth, AWS identity, Codex/Claude auth, Docker daemon and Xcode first launch. Their account output is suppressed and never written to state. These are narrow checks; success does not validate permissions for every project or resource. Failure may indicate connectivity, expired auth, configuration or permissions; follow the printed setup action and the provider's diagnostics locally.

For manual steps, use the IDs shown by status:

```sh
set-my-vibe mark neon setup
set-my-vibe mark git identity
set-my-vibe mark git identity --undo
```

A manual confirmation is never presented as verified evidence. Provider login remains in the provider's own CLI or app. No keys are transferred between machines.

## Shell setup

```sh
set-my-vibe configure shell --dry-run
set-my-vibe configure shell
```

This writes a generated shell snippet and appends a source line to `.zshrc` and `.bashrc`. It adds managed tool paths, Homebrew shell initialization, NVM loading and the matching direnv hook. Existing dotfile content is preserved. It does not change your default shell or automatically run `direnv allow` on a project.

Repeated runs use a separate marker to avoid duplicate source lines without reading your dotfiles. If you manually remove a source line, re-add the line from `configure shell --dry-run`; if the whole file is missing, rerunning configuration recreates the hook. Symlinked dotfiles are left alone with an explicit error so dotfile managers retain control. Bash login shells must source `.bashrc` from your own `.bash_profile` or `.profile` if they do not already do so. Fish is not configured in this version.

## Public AI skills

The catalog references the public GitHub sources recorded in the workstation's skills.sh lock metadata. It installs the named skills through the upstream skills CLI, without copying personal agent state or silently selecting every agent.

```sh
set-my-vibe skills list
set-my-vibe skills list --group design
set-my-vibe skills plan envx agent-browser --agents codex,claude-code
set-my-vibe skills install envx agent-browser --agents codex,claude-code
set-my-vibe skills install --group design --agents cursor
set-my-vibe skills install --all --agents codex,claude-code --yes
set-my-vibe skills status
```

Supported targets: `codex`, `claude-code`, `cursor`, `gemini-cli`, `antigravity`. Default targets are Codex and Claude Code. The `--all` option selects every catalog skill, while `--agents` stays explicit. Existing skill files at selected targets are skipped; updates remain an upstream `skills update` operation. Target detection checks `SKILL.md` presence, not source integrity or whether the agent has reloaded it.

Groups: `general`, `design`, `video`, `cmux`. The cmux group includes contributor-oriented skills as well as everyday usage skills; install only the ones you need.

Private/custom rules, local hooks, learned memories, plugin-managed skills and skills with no verified public source are excluded from automatic migration. They are identified in [inventory scope](docs/INVENTORY.md). Upstream skills keep their own licenses and instructions; this project's MIT license does not relicense them. Review their contents before granting agents access to tools or secrets.

### Let an AI agent help

Install this repository's small workflow skill:

```sh
npx skills@latest add rahulretnan/set-my-vibe --skill set-my-vibe --global --agent codex claude-code
```

Then ask your agent to inspect the workstation, propose a tool plan, resolve pending setup and build a project within your scope. The skill keeps installation evidence separate from project readiness. It does not authorize deployment, paid resource creation or copying credentials. Read [SKILL.md](skills/set-my-vibe/SKILL.md).

## Start a project

```sh
set-my-vibe project list
set-my-vibe project better-t-stack my-app
set-my-vibe project better-t-stack my-app --run
set-my-vibe project cloudflare my-worker --run
set-my-vibe project neon my-saas --run
set-my-vibe project upstash my-service --run
set-my-vibe project next my-site --run
set-my-vibe project expo my-mobile-app --run
set-my-vibe project shadcn --cwd ./my-site --run
```

Without `--run`, these print the exact command and setup guide. `--run` executes the upstream interactive generator after confirmation; add `--yes` to skip the wrapper confirmation. Bun is required. New projects need a new directory name containing lowercase letters, digits and hyphens. Existing directories are never overwritten by a new-project recipe. Use `--cwd` to choose the parent directory.

- `shadcn` runs `bunx shadcn@latest init` in an existing project.
- `better-t-stack` runs the current interactive Better-T-Stack generator so users can choose their own architecture.
- `cloudflare` uses Cloudflare's generator with initial deployment disabled.
- `neon` and `upstash` use Better-T-Stack plus a service-specific setup guide. They do not claim to inject a working database, cache, auth system or production integration automatically.
- `next` and `expo` use their official generators.

New projects receive `VIBE-SETUP.md` after successful generation. It records the remaining service setup and production checks. Follow upstream prompts carefully: a generator may offer integrations or account actions. No deploy/provision command is appended by this wrapper. If a generator fails, its partial files are retained for inspection.

```sh
set-my-vibe project check --cwd ./my-app
```

This reports familiar check scripts and CI-directory presence. It does not run tests or certify the app. Use [the production checklist](docs/PRODUCTION.md) to collect actual evidence for persistence, authorization, tenant isolation, secrets, failure recovery, tests, real browser/device journeys, observability, backups and rollback.

## Move your selection to another machine

```sh
set-my-vibe scan --json
set-my-vibe export > vibe-intent.json
# Or export the catalog tools detected on the current machine:
set-my-vibe export --detected > vibe-intent.json

# On the destination:
set-my-vibe install --from vibe-intent.json --dry-run
set-my-vibe install --from vibe-intent.json
set-my-vibe skills install --from vibe-intent.json
set-my-vibe status
```

Exports contain tool IDs, selected skill IDs and agent names only. Tool and skill restoration are separate commands. If no skills were selected, skip the skill restore command. The portable skill manifest installs all exported skills to the exported agent set; local status keeps the individual target choices made on this machine. There are no usernames, home paths, account IDs, tokens or environment values in this format. It records intent, not locked versions or a complete backup. Imports cannot provide arbitrary shell commands.

## Platform support

| Component | macOS | Linux |
| --- | --- | --- |
| CLI / bootstrap | Apple Silicon and Intel | x86_64 and arm64 with a compatible Node runtime |
| System packages | Homebrew | Homebrew on supported glibc distributions |
| npm tools / upstream scripts | Where supported by the publisher | Where supported by the publisher |
| Xcode / iOS Simulator | Apple installation and first-launch steps | Unsupported |
| Android Studio / SDKs | Homebrew app, manual SDK/license/AVD setup | Official download and manual SDK/license/AVD setup |
| Docker | Homebrew Desktop, start and review license manually | Follow Docker's distro-specific Engine/Desktop guide |
| GUI editors / T3 Desktop | Homebrew where cataloged | Official Linux download instructions |
| xtool | Homebrew tap, manual SDK/signing setup | Official Swift/Darwin SDK installation guide |

Homebrew's Linux prerequisites and support constraints apply. Minimal Linux images may need build tools, curl, Git and sudo-capable prefix setup first. Alpine/musl, 32-bit machines and native Windows are not bootstrap targets. WSL2 can use a compatible Linux distribution, subject to individual GUI/device limitations. GUI apps require a desktop session. The T3 CLI's upstream Intel Mac limitation is explicitly reported; its desktop app is separate.

Unsupported and manual steps stay visible; they are never silently reported as installed. Xcode, Android licenses, signing, simulator/emulator images, Docker permissions and paid service accounts cannot be completed by an unattended universal script.

## Storage, privacy and updates

Default locations:

- `~/.local/bin/set-my-vibe`: launcher.
- `~/.local/share/set-my-vibe/releases/`: versioned CLI files.
- `~/.local/share/set-my-vibe/runtime/`: private Node, only when needed.
- `~/.local/share/set-my-vibe/npm/`: npm tools installed by this CLI.
- `~/.local/share/set-my-vibe/state.json`: selections, outcomes and manual confirmations, mode `0600`.
- `~/.local/share/set-my-vibe/shell.sh`: optional generated shell integration.

`SET_MY_VIBE_HOME` selects a different state/data directory when running from source. Bootstrap launchers remember their chosen directory. Homebrew, native installers and skills use their own normal locations. The CLI does not back up, export or relocate their credentials.

Re-run the bootstrap with `--version vX.Y.Z --no-setup` for an existing published release. The launcher switches only after validation. Keep older release directories for rollback; using an older version should be evaluated against its state format. Update third-party tools with their own documented package manager; `resume` does not upgrade tools already detected.

To uninstall, remove the managed launcher and the source lines added to your shell files. Inspect the data directory before removing it: deleting it also removes tools installed into its npm prefix and a private Node runtime. Installed Homebrew/native tools, skills, projects and provider credentials remain managed separately. There is no destructive blanket-uninstall command.

## Troubleshooting

- **Command not found:** use the full launcher path, configure the shell and open a new terminal. Check the selected tool's upstream PATH instructions.
- **`needs-path`:** the installer exited successfully but the expected command was not detected. Inspect its output and reopen the shell; `resume` retries missing entries.
- **Package failure:** resolve the reported upstream failure or Homebrew prerequisites, then `resume`. Installed tools are skipped.
- **`operation.lock` / `bootstrap.lock`:** another mutation is active, or a prior process crashed. Confirm no installer is running before removing only the named stale lock directory.
- **Corrupt `state.json`:** back it up locally and repair or remove it deliberately. The CLI refuses to overwrite unparseable state.
- **Pending login despite existing login:** default status does not inspect auth. Use `--verify` where supported or explicitly confirm a manual step.
- **Existing project directory:** choose a new name, or use the existing-project shadcn recipe. The CLI will not delete partial generator output.
- **Bash hook not loading:** ensure your Bash login profile sources `.bashrc`.

Install commands return nonzero for failed, blocked or undetected attempted installs. Unsupported/manual-only entries are reported without failing the run. Status is a report and returns zero even when work remains; inspect JSON states in automation. Invalid inputs and failed generators return nonzero.

## Development and trust

```sh
npm run check
npm test
npm run audit:public
```

No dependency installation is needed to run the tests. CI runs on macOS and Linux with Node 22.20 and 24, plus Gitleaks. Tests use isolated homes, mocked installers and bootstrap download fixtures. They do not install the full tool catalog or establish full clean-machine compatibility. See [verification evidence](docs/VERIFICATION.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md) and [inventory scope](docs/INVENTORY.md).

Upstream software and skills execute code under their own licenses and trust boundaries. HTTPS and same-publisher checksums detect corruption, not publisher compromise. This CLI has no telemetry; upstream tools may have their own. Review plans and sources before execution.
