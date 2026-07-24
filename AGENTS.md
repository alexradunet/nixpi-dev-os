# nixpi-dev-os

Self-hosted development environment for remote Pi-based development over SSH,
plus the Pi orchestration tooling that runs on it. Deliberately separate from any
application repository: this repo defines the box and the agent workflow, not an
app.

The generic orchestration playbook is injected globally by the `pi/orchestrator`
extension (`before_agent_start`). This file composes with it and carries only
project-specific facts: layout, the environment the NixOS config produces, and
the commands to build, test, and apply things here.

## Layout

```
nixos/        NixOS system configuration (flake + modules) — the dev environment
pi/           Pi extensions, symlinked globally on rebuild
  orchestrator/   Orchestration: hooks only (skills, roles, playbook, schema)
  agent-browser/  Headless-browser tool wrapper
para/         PARA state: projects/, areas/, resources/, archive/
```

## The dev environment (nixos/)

SSH is the single entry point. Port `22222`, key-only auth, fail2ban protected.

```bash
ssh -p 22222 balaur@<host-ip>
ssh -p 22222 -L 8080:localhost:8080 balaur@<host-ip>   # local forward
ssh -p 22222 -R 9090:localhost:3000 balaur@<host-ip>   # remote forward
```

What the config provides:

- **Access**: sshd on `22222` only (`openFirewall = false`, port opened
  explicitly via `firewall.allowedTCPPorts`). Password and kbd-interactive auth
  off, `PermitRootLogin no`, `MaxAuthTries 3`, `LoginGraceTime 30`. fail2ban:
  `maxretry 3`, `bantime 1h`, ignores `127.0.0.1/8`.
- **Paseo**: `services.paseo` runs as `balaur`, so spawned agents inherit the
  user's git/ssh/credentials and PATH. Loopback-only by default; remote access
  goes through the upstream relay.
- **Toolchain**: `nodejs_24`, `go_1_26`, `python314` (with pip), Rust stable
  (`rustc`, `cargo`, `clippy`, `rustfmt`, `rust-analyzer`), `gcc`, `gnumake`,
  `pkg-config`, `openssl`, `nixd`, `nixfmt`, `git`, `gh`, `typescript`, plus
  `agent-browser` and `chromium`. Pi itself comes from the `llm-agents` flake.
- **Pi extensions**: an activation script symlinks every subdir of
  `nixpi.extensionsPath` that has an `index.ts` into `~/.pi/agent/extensions/`,
  pruning stale broken links first. `extensionsPath` points at the **main
  checkout** (`/home/balaur/projects/nixpi-dev-os/pi`), so a worktree's
  extension changes are not live until loaded explicitly (see Testing).
- **Nix**: `nix-command` + `flakes` enabled; `balaur` is a trusted user so the
  numtide binary cache (`flake.nix` `nixConfig`) applies without prompting;
  `allowUnfree = true`. `PI_SKIP_VERSION_CHECK=1`, `PI_TELEMETRY=0` set globally.

### Security decisions (accepted tradeoffs)

- **Passwordless sudo for wheel** (`wheelNeedsPassword = false`): deliberate
  single-user dev convenience. With key-only SSH a leaked key already yields
  root; the mitigation is key hygiene (per-device keys, rotate on loss), not a
  sudo password.
- **`AllowTcpForwarding = "yes"`**: intentional; forwarding is the documented
  service-access mechanism above. Narrow to `local` only if remote (`-R`)
  forwards stop being needed.
- **Do not add `rustup` alongside the stable Rust packages**: its proxy shims
  win the profile symlink collision and break `rustc` until a default toolchain
  is set. Use `rustup` alone if multiple toolchains are needed.

## Common commands

Apply the system configuration:

```bash
cd /home/balaur/projects/nixpi-dev-os
sudo nixos-rebuild switch --flake ./nixos
```

Update the Pi pin, then rebuild:

```bash
nix flake update llm-agents --flake ./nixos
sudo nixos-rebuild switch --flake ./nixos
```

## Testing

The orchestrator registers no tool. Its contract is
`pi/orchestrator/orchestrator.test.ts` (role briefings, skill dirs, worker-output
schema, playbook including the main-checkout guard). One command:

```bash
node --experimental-strip-types --test pi/orchestrator/orchestrator.test.ts
```

Runtime check is a load smoke: load the extension explicitly and confirm pi
starts and the hooks fire.

```bash
pi --no-extensions -e ./pi/orchestrator/index.ts -p --no-session \
  --model qwen-token-plan/qwen3.6-flash --thinking off "Reply with exactly: ok"
```

Because the global symlink targets the main checkout, testing a worktree's
changes requires loading that copy with `-e <path> --no-extensions`
(`para/resources/lessons/smoke-testing-the-orchestrator.md`). A real
`paseo run` is the integration test for delegation.

## Conventions here

- Nix: format with `nixfmt`; type every module option with `lib.types.*`.
- Extensions resolve all bundled files relative to their own directory; the
  extension serves skills and injects the playbook, and registers no tool.
- Orchestration state lives under `para/`; the per-repo model registry is
  `para/resources/model-registry.md`. Hard-won fixes are recorded as lessons in
  `para/resources/lessons/`.
