# nixpi-dev-os

The self-hosted **development environment** for remote Pi-based development: the NixOS configuration that provisions the development host and the project-local Pi extensions that support remote development over NetBird. This repository is intentionally separate from any application repository so that the application stays decoupled from the machine and tooling that develop it.

Extracted from `alexradunet/balaur` at commit `3fa7e2a` on 2026-07-23. The application repository retains its own history of these files; this repository starts a focused history for the environment.

## Layout

```
nixos_dev_env/                          NixOS system configuration (flake + modules)
  flake.nix                             Pins nixpkgs, llm-agents (Pi), and Herdr
  configuration.nix                     NetBird, Caddy HTTPS, nixpi-dev service, user, locales
  hardware-configuration.nix            Host filesystems and kernel modules
  netbird-setup-key.example             Enrollment placeholder (copy, never commit a real key)
extensions/                             Pi package conventional directory (auto-discovered)
  nixpi-netbird/                        Closed, TUI-confirmed NetBird Cloud Pi extension
  herdr-agents/                         Visible Herdr worker bridge Pi extension
docs/adr/0003-netbird-pi-extension.md   ADR for the NetBird extension's security boundaries
```

## Relationship to the application repository

The NixOS `nixpi-dev` service runs the application's dependency-free development server from the application checkout, not from this repository:

```
WorkingDirectory = /home/nixpi/projects/app
ExecStart         = ${nodejs_24}/bin/node scripts/dev-server.mjs
```

So the two repositories are checked out side by side on the development host:

```
/home/nixpi/projects/app              application checkout
/home/nixpi/projects/nixpi-dev-os     environment checkout (this repository)
```

The application repository's `AGENTS.md` and `docs/agents/development-workflow.md` describe the operator workflow and point here for the environment specifics.

## Applying the NixOS configuration

```bash
cd /home/nixpi/projects/nixpi-dev-os
sudo nixos-rebuild switch --flake ./nixos_dev_env
```

This installs Pi and Herdr system-wide, starts NetBird, Caddy, and the `nixpi-dev` live-reload service, and creates the protected `/etc/nixpi/netbird.env` file (empty). Update Pi and Herdr pins with:

```bash
nix flake update llm-agents herdr --flake ./nixos_dev_env
sudo nixos-rebuild switch --flake ./nixos_dev_env
```

## Installing the Pi extensions

Pi auto-discovers both extensions from the conventional `extensions/` directory when this repository is installed as a Pi git package. Install it globally so the tools are available in any trusted project on this host:

```bash
pi install git:github.com/alexradunet/nixpi-dev-os@<ref>
```

Or install it project-locally inside the application checkout (written to `.pi/git/`):

```bash
cd /home/nixpi/projects/app
pi install -l git:github.com/alexradunet/nixpi-dev-os@<ref>
```

After the application project is trusted, Pi loads the extensions and these commands and tools become available:

- `/netbird` and `/netbird doctor` (NetBird dashboard and readiness check)
- `netbird_inspect` and `netbird_configure` (closed NetBird Cloud read/mutate tools)
- `herdr_agent` (visible Herdr worker bridge)

The `herdr_agent` extension reads worker roles from the application checkout's `.pi/agents/*.md` and skills from `.pi/skills/`; only the orchestration mechanism lives here. See `docs/adr/0003-netbird-pi-extension.md` and `extensions/nixpi-netbird/README.md` for the security model.

## NetBird service-user credential

The NetBird extension reads its Personal Access Token on demand from `/etc/nixpi/netbird.env`, a non-symlink regular file owned by `root:nixpi-secrets` with mode `0640` that the NixOS configuration creates empty. A human operator creates a dedicated NetBird **service user** with the **Network Admin** role, creates a PAT for it, and installs the token with `sudoedit`. The token is never placed in this repository, the Nix store, a systemd environment, an issue, a chat, or a Pi session. See `extensions/nixpi-netbird/README.md` for the full rotation procedure.

## Testing

The extensions use only Node built-ins and Pi-provided packages and introduce no package manifest or dependency install.

```bash
node --test extensions/nixpi-netbird/*.test.mjs
node --test extensions/herdr-agents/test/*.test.mjs
node --check extensions/nixpi-netbird/*.mjs
node --check extensions/herdr-agents/*.js
```

The `herdr-agents` role-parser suite includes three project-integration assertions that check the application repository's real `.pi/agents` roles and `.pi/skills`. They run automatically when the application checkout is a sibling (`../app`) or when `NIXPI_APP_ROOT` points at it, and skip otherwise so this suite stays self-contained.
