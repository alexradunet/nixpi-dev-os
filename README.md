# nixpi-dev-os

Self-hosted **development environment** for remote Pi-based development over SSH. NixOS configuration, Pi extensions, and orchestration tooling — intentionally separate from any application repository.

## Layout

```
nixos_dev_env/                          NixOS system configuration (flake + modules)
  flake.nix                             Pins nixpkgs, llm-agents (Pi), and Herdr
  configuration.nix                     SSH, fail2ban, firewall, user, locales, pi global-install
  hardware-configuration.nix            Host filesystems and kernel modules
pi_skills/                              Orchestration skills: grill, explore, plan, implement, review, teach, janitor
pi_extensions/                          Pi extensions
  herdr-agents/                         Visible Herdr worker bridge Pi extension
.pi/agents/                             Herdr worker roles (installed globally on rebuild; one per phase)
.pi/skills -> ../pi_skills              Project symlink so a role's `skills:` field resolves
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

Update Pi and Herdr pins with:

```bash
nix flake update llm-agents herdr --flake ./nixos_dev_env
sudo nixos-rebuild switch --flake ./nixos_dev_env
```

## Skills, extensions, and roles (pi discovery)

The orchestration is installed **globally** so it is available in every repository — e.g. opening pi in `../balaur` gives the orchestration skills plus balaur's own skills.

On every rebuild, the activation scripts in `nixos_dev_env/configuration.nix` (driven by `nixpi.skillsPath` / `nixpi.extensionsPath` in `flake.nix`) symlink the sources into pi's global instance:

- `pi_skills/*` → `~/.pi/agent/skills/*`
- `pi_extensions/*` → `~/.pi/agent/extensions/*`
- `.pi/agents/*` → `~/.pi/agent/agents/*`

Add a skill or extension under `pi_skills/` / `pi_extensions/` and rebuild; it is picked up automatically. The orchestration skills are user slash-commands (`/grill`, `/explore`, `/plan`, `/implement`, `/review`, `/teach`, `/janitor`); they carry `disable-model-invocation: true`, so they do not appear in the model's auto-invokable skill list.

**Roles** (`.pi/agents/*.md`) are thin herdr worker wrappers, one per phase. They are installed **globally** too, so herdr workers can resolve them in every repository. herdr scans the global `~/.pi/agent/agents/` first and then the current directory's `.pi/agents/`, so a project-local role overrides a global role with the same name. A role's `skills: {name}` field resolves through the `.pi/skills -> ../pi_skills` symlink (herdr's skill resolver checks the project dirs `.pi/skills/` and `.agents/skills/`).

## Testing

```bash
node --test pi_extensions/herdr-agents/test/*.test.mjs
node --check pi_extensions/herdr-agents/*.js
```
