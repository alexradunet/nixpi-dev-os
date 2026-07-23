# nixpi-dev-os

Self-hosted **development environment** for remote Pi-based development over SSH. NixOS configuration, Pi extensions, and orchestration tooling — intentionally separate from any application repository.

## Layout

```
nixos_dev_env/                          NixOS system configuration (flake + modules)
  flake.nix                             Pins nixpkgs and llm-agents (Pi)
  configuration.nix                     SSH, fail2ban, firewall, user, locales, pi global-install
  hardware-configuration.nix            Host filesystems and kernel modules
pi_skills/                              Orchestration skills: grill, explore, plan, implement, review, teach, janitor
pi_extensions/                          Pi extensions
  subagent/                             Subagent delegation tool (patched copy of pi's official example)
.pi/agents/                             Subagent roles for spawnable phases (installed globally on rebuild)
.pi/skills -> ../pi_skills              Project symlink so pi resolves orchestration skills in-session
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
sudo nixos-rebuild switch --flake ./nixos_dev_env
```

Update the Pi pin with:

```bash
nix flake update llm-agents --flake ./nixos_dev_env
sudo nixos-rebuild switch --flake ./nixos_dev_env
```

## Skills, extensions, and roles (pi discovery)

The orchestration is installed **globally** so it is available in every repository — e.g. opening pi in `../balaur` gives the orchestration skills plus balaur's own skills.

On every rebuild, the activation scripts in `nixos_dev_env/configuration.nix` (driven by `nixpi.skillsPath` / `nixpi.extensionsPath` in `flake.nix`) symlink the sources into pi's global instance:

- `pi_skills/*` → `~/.pi/agent/skills/*`
- `pi_extensions/*` → `~/.pi/agent/extensions/*`
- `.pi/agents/*` → `~/.pi/agent/agents/*`

Add a skill or extension under `pi_skills/` / `pi_extensions/` and rebuild; it is picked up automatically. The orchestration skills are user slash-commands (`/grill`, `/explore`, `/plan`, `/implement`, `/review`, `/teach`, `/janitor`); they carry `disable-model-invocation: true`, so they do not appear in the model's auto-invokable skill list.

**Roles** (`.pi/agents/*.md`) are subagent definitions, one per spawnable phase (explore, plan, implement, review). Frontmatter: `name`, `description`, `model`, `thinking`, `tools`. The `subagent` tool discovers them from the global `~/.pi/agent/agents/` directory and runs each delegation as a one-shot `pi` subprocess. In-session phases (grill, teach, janitor) have no role file; their skills are invoked directly.

## Testing

```bash
pi -e ./pi_extensions/subagent/index.ts -p --no-session "Reply with exactly: ok"
```

The extension is vendored from pi's official example with a small local patch (thinking levels, worker nesting guard); the real test is delegation itself.
