# nixpi-dev-os

Self-hosted **development environment** for remote Pi-based development over SSH. NixOS configuration, Pi extensions, and orchestration tooling — intentionally separate from any application repository.

## Layout

```
nixos/                                  NixOS system configuration (flake + modules)
  flake.nix                             Pins nixpkgs and llm-agents (Pi)
  configuration.nix                     SSH, fail2ban, firewall, user, locales, pi extension install
  hardware-configuration.nix            Host filesystems and kernel modules
pi/                                     Pi extensions
  orchestrator/                         Orchestration extension: hooks only (skills + role briefings + playbook + registry template)
    index.ts                            Hooks only: serves skills (resources_discover), injects the playbook (before_agent_start). Registers no tool.
    AGENTS.md                           Generalized orchestration playbook (injected via before_agent_start)
    model-registry-template.md          Seed template for a repo's para/resources/model-registry.md
    worker-output-schema.json           JSON schema foreground paseo workers conform their final output to
    skills/                             Orchestration skills: grill, explore, plan, implement, review, teach, janitor
    roles/                              Role briefings for spawnable phases: explore, plan, implement, review (consumed by the orchestrator to compose paseo run)
```

## Access

SSH is the single entry point. Port `22222`, key-only auth, fail2ban protected.

```bash
ssh -p 22222 balaur@<host-ip>
```

Port forwarding for services:

```bash
ssh -p 22222 -L 8080:localhost:8080 balaur@<host-ip>   # local forward
ssh -p 22222 -R 9090:localhost:3000 balaur@<host-ip>   # remote forward
```

### Security decisions

- **Passwordless sudo for wheel** (`security.sudo.wheelNeedsPassword = false`):
  deliberate dev convenience on a single-user box. With key-only SSH, a leaked
  key yields passwordless root — the accepted tradeoff here; the mitigation is
  key hygiene (per-device keys, rotate on loss), not a sudo password.
- **SSH port forwarding enabled** (`AllowTcpForwarding = "yes"`): intentional;
  forwarding is the documented service-access mechanism above. Narrow to
  `local` only if remote (`-R`) forwards stop being needed.

## Applying the NixOS configuration

```bash
cd /home/balaur/projects/nixpi-dev-os
sudo nixos-rebuild switch --flake ./nixos
```

Update the Pi pin with:

```bash
nix flake update llm-agents --flake ./nixos
sudo nixos-rebuild switch --flake ./nixos
```

## The orchestrator extension (pi discovery)

The orchestration ships as a single pi extension at `pi/orchestrator/` and is installed **globally** so it is available in every repository. It registers no tool; spawning workers is delegated to the Paseo daemon (see `para/resources/paseo-orchestration.md`). The extension only serves the skills and injects the playbook. On every rebuild, the activation script in `nixos/configuration.nix` (driven by `nixpi.extensionsPath` in `flake.nix`) symlinks it into pi's global instance:

- `pi/*` → `~/.pi/agent/extensions/*`

The extension bundles everything the orchestration needs and resolves it all relative to its own directory:

- **Skills** (`orchestrator/skills/`) — served via `resources_discover`. User slash-commands (`/grill`, `/explore`, `/plan`, `/implement`, `/review`, `/teach`, `/janitor`); they carry `disable-model-invocation: true`, so they do not appear in the model's auto-invokable skill list.
- **Roles** (`orchestrator/roles/`) — role briefings, one per spawnable phase (explore, plan, implement, review). The orchestrator reads a briefing and composes a `paseo run` invocation from it (provider, thinking, workspace from the frontmatter; the body is the worker prompt). Each briefing points the worker at its skill by absolute path.
- **Playbook** (`orchestrator/AGENTS.md`) — the generalized "way of work", injected into the system prompt via `before_agent_start`. It composes with any repo-local `AGENTS.md`.
- **Registry template** (`orchestrator/model-registry-template.md`) — seed for a repo's `para/resources/model-registry.md` (auto-created from `paseo provider ls` / `paseo provider models` on first use).
- **Worker output schema** (`orchestrator/worker-output-schema.json`) — the JSON schema foreground workers (explore, plan, review) conform their final output to.

In-session phases (grill, teach, janitor) have no role file; invoke their skills directly.

## Testing

The extension registers no tool and has no unit tests (the pure modules that backed the retired `subagent` tool were deleted with it in project 006). Verification is a runtime load smoke: load the extension explicitly and confirm pi starts and the hooks fire.

```bash
pi --no-extensions -e ./pi/orchestrator/index.ts -p --no-session --model qwen-token-plan/qwen3.6-flash --thinking off "Reply with exactly: ok"
```

The global symlink (`~/.pi/agent/extensions/orchestrator`) points at the main checkout, so testing a worktree's changes requires loading that copy explicitly with `-e <path> --no-extensions` (see `para/resources/lessons/smoke-testing-the-orchestrator.md`). Delegation itself (a real `paseo run`) is the integration test.
