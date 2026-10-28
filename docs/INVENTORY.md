# Inventory scope

The initial catalog was prepared from developer tooling metadata on a Mac: Homebrew formula/cask names, top-level npm package names, executable names, developer application names, skill directory names and selected public source fields from the skills.sh lock file.

No shell history, environment values, credential files, SSH material, personal agent conversations, private project source, cloud resource lists, or account profiles were collected into this repository. Transitive Homebrew libraries are intentionally left to the package manager rather than exposed as dozens of user-facing choices. Some useful tools requested for the destination setup were added even when not detected locally, including Upstash and xtool.

The catalog covers language runtimes, shell utilities, AI coding agents, cloud/data CLIs, mobile development, media tooling and developer apps. It excludes general desktop/communication apps and superdev by request. The developer app selection includes tools that may have separate commercial terms, such as Docker Desktop and DataGrip.

## Skills with public provenance

The initial skills.sh metadata provided 55 named skills across 18 public GitHub repositories. The repository stores only source/name references. Source accessibility was checked anonymously; upstream licensing remains applicable and is not replaced by this repository's MIT license.

## Skills outside automatic migration

The source machine also has local or plugin-managed skills. These were not copied:

- Personal/local rules such as project-rules, git-commit-rules, nextjs-15-rules and shadcn-rules.
- Local workflow helpers such as jev-router, chirp, clean-up and cua-driver where a public install source was not established from the recorded skills lock.
- Learned, synced, end-of-day and other personal context folders.
- Codex system/runtime skills and app-provided capabilities (documents, spreadsheets, presentations, PDF, computer history and visualization).
- Expo plugin skills, which are managed by that plugin rather than the inventoried skills.sh lock.
- Other skill copies with no lock entry proving the current public origin.

Install agent plugins using each host's supported plugin manager, then verify they appear in that host. Recreate private rules deliberately after reviewing them locally. This CLI does not copy plugin caches, account-specific settings or undocumented local hooks. A destination machine can have equivalent capabilities without inheriting source-machine credentials or private instructions.

`set-my-vibe scan` is a catalog-based scan, not a forensic inventory or complete package-manager export. Its JSON is safe by construction because it contains catalog IDs and fixed setup text rather than machine/account details. Exact runtime versions, global package versions and project dependencies are intentionally not migrated as a locked snapshot.
