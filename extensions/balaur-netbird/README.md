# Balaur NetBird Pi extension

Project-local, dependency-free Pi integration for the NetBird Cloud API. It adds a bounded read-only dashboard, a read tool, and a narrowly allowlisted mutation tool. It is loaded only after Pi trusts this repository.

## Security model

- Cloud requests have the fixed origin `https://api.netbird.io`; tool input cannot supply a URL, path, or HTTP method.
- The token is read on demand from `/etc/balaur/netbird.env`. It is never stored in the repository, Nix store, systemd environment, Pi session entries, tool output, dashboard, or logs.
- The config reader rejects symlinks and requires a regular file owned by `root:balaur-secrets` with mode `0640`. Only one non-empty `NETBIRD_API_TOKEN` assignment is accepted; `export`, duplicate keys, and unknown keys are rejected.
- JSON responses, previews, presenter output, and dashboard lines are bounded. API and configuration errors do not include response bodies, token values, or file content.
- `netbird_inspect` has closed read views. There is no arbitrary HTTP tool.
- `netbird_configure` works only in interactive TUI mode. It validates a closed operation/body contract, serializes mutations behind one lock, shows a deterministic before/after preview, asks through `ctx.ui.confirm`, then rechecks remote state before exactly one write. Cancellation or stale state sends no write.
- The dashboard is always read-only.

The token should belong to a dedicated NetBird **service user** with the **Network Admin** role. Do not reuse a human PAT or an account-owner token.

## Host setup

Apply the NixOS configuration first; it creates the `balaur-secrets` group, `/etc/balaur`, and an empty protected token file. Reconnect the NetBird SSH session afterward so `balaur` receives its new supplementary group:

```bash
sudo nixos-rebuild switch --flake ./nixos_dev_env
sudo stat -c '%U %G %a %n' /etc/balaur /etc/balaur/netbird.env
```

In the NetBird dashboard, create a dedicated service user, assign **Network Admin**, and create a Personal Access Token for that service user. Open the protected file with `sudoedit` and add the single `NETBIRD_API_TOKEN` assignment. Do not paste the token into a shell command, terminal transcript, Nix expression, systemd unit, issue, or chat.

```bash
sudoedit /etc/balaur/netbird.env
sudo chown root:balaur-secrets /etc/balaur/netbird.env
sudo chmod 0640 /etc/balaur/netbird.env
```

Restart Pi or run `/reload`, then run `/netbird doctor`. For rotation, create the replacement PAT first, replace the file contents with `sudoedit`, verify with `/netbird doctor`, and only then revoke the old PAT in NetBird. Never print either token during rotation.

## Commands and tools

- `/netbird` — opens the non-overlay full-screen read-only dashboard.
- `/netbird doctor` — checks local daemon readiness and Cloud API access without showing command output or credentials.
- `netbird_inspect` — reads `overview`, `peers`, `groups`, `policies`, `networks`, `routes`, `dns`, `posture_checks`, or recent `events`; supported resource views accept an optional detail ID.
- `netbird_configure` — TUI-only mutations with `operation`, optional `id`, and optional JSON `body`. It intentionally has no confirmation parameter.

The footer status refreshes at low frequency and combines `netbird status --check ready` with a bounded Cloud peer summary. Its timer and in-flight status check are cleaned up when the Pi session shuts down or reloads.

## Cloud API scope

Read mappings:

- peers: `/api/peers`
- groups: `/api/groups`
- policies: `/api/policies`
- networks: `/api/networks`
- routes: `/api/routes`
- DNS: `/api/dns/settings` and `/api/dns/nameservers`
- posture checks: `/api/posture-checks`
- recent events: `/api/events`

Allowed writes are create/replace/delete for groups, policies, posture checks, routes, networks, and nameserver groups, plus DNS-settings replacement. All peer writes and every other API operation are deliberately unavailable because Network Admin has read-only peer access.

## Tests

No live Cloud calls are made. All filesystem, group lookup, fetch, confirmation, stale-state, lock, and presenter behavior is injected or mocked.

```bash
node --test extensions/balaur-netbird/*.test.mjs
node --check extensions/balaur-netbird/config.mjs
node --check extensions/balaur-netbird/client.mjs
node --check extensions/balaur-netbird/contracts.mjs
node --check extensions/balaur-netbird/mutations.mjs
node --check extensions/balaur-netbird/presenters.mjs
```

## Layout and loading

This repository is the Balaur self-hosted development environment, extracted from the [`alexradunet/balaur`](https://github.com/alexradunet/balaur) application repository to keep the application separate from its environment. The extension lives at `extensions/balaur-netbird/`; the NixOS configuration that provisions its protected credential file lives at `nixos_dev_env/`.

Pi auto-discovers this extension from the conventional `extensions/` directory when the repository is installed as a Pi git package:

```bash
pi install git:github.com/alexradunet/balaur-dev-os@<ref>
```

Install it globally (`~/.pi/agent/git/`) or project-locally in the application checkout (`-l`, `.pi/git/`). After the project is trusted, Pi loads the extension and the `/netbird`, `/netbird doctor`, `netbird_inspect`, and `netbird_configure` commands and tools become available. The extension reads the NetBird API token on demand from `/etc/balaur/netbird.env`, which the NixOS configuration creates as an empty protected file; it never appears in this repository.

## Official references

- [NetBird Public API](https://docs.netbird.io/api)
- [API authentication](https://docs.netbird.io/api/guides/authentication)
- [Service users and Personal Access Tokens](https://docs.netbird.io/manage/public-api)
- [NetBird user roles](https://docs.netbird.io/manage/team/user-roles)
- [Official OpenAPI document](https://github.com/netbirdio/netbird/blob/main/shared/management/http/api/openapi.yml)
