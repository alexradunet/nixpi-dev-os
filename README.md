# nixpi-dev-os

Self-hosted **development environment** for remote Pi-based development over SSH. NixOS configuration, Pi extensions, and orchestration tooling — intentionally separate from any application repository.

## Layout

```
nixos/                                  NixOS system configuration (flake + modules)
  flake.nix                             Pins nixpkgs and llm-agents (Pi)
  configuration.nix                     SSH, fail2ban, firewall, user, locales, pi extension install
  hardware-configuration.nix            Host filesystems and kernel modules
pi/                                     Pi extensions
  orchestrator/                         Orchestration extension: subagent tool + skills + roles + playbook + registry template
    index.ts                            subagent delegation tool; serves skills; injects the playbook
    agents.ts                           Role discovery (bundled roles/ + user + project)
    AGENTS.md                           Generalized orchestration playbook (injected via before_agent_start)
    model-registry-template.md          Seed template for a repo's para/resources/model-registry.md
    skills/                             Orchestration skills: grill, explore, plan, implement, review, teach, janitor
    roles/                              Subagent roles for spawnable phases: explore, plan, implement, review
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

The orchestration ships as a single pi extension at `pi/orchestrator/` and is installed **globally** so it is available in every repository. On every rebuild, the activation script in `nixos/configuration.nix` (driven by `nixpi.extensionsPath` in `flake.nix`) symlinks it into pi's global instance:

- `pi/*` → `~/.pi/agent/extensions/*`

The extension bundles everything the orchestration needs and resolves it all relative to its own directory:

- **Skills** (`orchestrator/skills/`) — served via `resources_discover`. User slash-commands (`/grill`, `/explore`, `/plan`, `/implement`, `/review`, `/teach`, `/janitor`); they carry `disable-model-invocation: true`, so they do not appear in the model's auto-invokable skill list.
- **Roles** (`orchestrator/roles/`) — subagent definitions, one per spawnable phase (explore, plan, implement, review). The `subagent` tool discovers them from the bundled `roles/` directory (plus the user and project agent dirs) and runs each delegation as a one-shot `pi` subprocess, injecting `NIXPI_SKILLS_DIR` so the worker can read its skill.
- **Playbook** (`orchestrator/AGENTS.md`) — the generalized "way of work", injected into the system prompt via `before_agent_start`. It composes with any repo-local `AGENTS.md`.
- **Registry template** (`orchestrator/model-registry-template.md`) — seed for a repo's `para/resources/model-registry.md` (auto-created from `pi --list-models` on first use).

In-session phases (grill, teach, janitor) have no role file; invoke their skills directly.

## Testing

Unit tests (headless, no pi, no model calls):

```bash
node --test pi/orchestrator/
```

Requires Node ≥ 24 (native TypeScript type-stripping). The suite covers the pure core (`core.ts`: result classification, output caps, exit/signal outcome, the project-agent trust gate, stream line splitting, concurrency mapping) and the display formatters (`format.ts`). Subprocess and TUI code is not unit-tested; smoke-test it by loading the extension explicitly:

```bash
pi --no-extensions -e ./pi/orchestrator/index.ts -p --no-session "Reply with exactly: ok"
```

The extension is vendored from pi's official subagent example with local patches (thinking levels, worker nesting guard, bundled role discovery, skill serving, playbook injection, fail-closed headless gate); delegation itself is the integration test.
