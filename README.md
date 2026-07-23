# nixpi-dev-os

Self-hosted **development environment** for remote Pi-based development over SSH. NixOS configuration, Pi extensions, and orchestration tooling — intentionally separate from any application repository.

## Layout

```
nixos_dev_env/                          NixOS system configuration (flake + modules)
  flake.nix                             Pins nixpkgs, llm-agents (Pi), and Herdr
  configuration.nix                     SSH, fail2ban, firewall, user, locales
  hardware-configuration.nix            Host filesystems and kernel modules
pi_extensions/                          Pi extensions (auto-discovered)
  herdr-agents/                         Visible Herdr worker bridge Pi extension
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

## Installing the Pi extensions

Pi auto-discovers extensions from the conventional `pi_extensions/` directory when this repository is installed as a Pi git package:

```bash
pi install git:github.com/alexradunet/nixpi-dev-os@<ref>
```

After the project is trusted, `herdr_agent` (visible Herdr worker bridge) becomes available.

## Testing

```bash
node --test pi_extensions/herdr-agents/test/*.test.mjs
node --check pi_extensions/herdr-agents/*.js
```
