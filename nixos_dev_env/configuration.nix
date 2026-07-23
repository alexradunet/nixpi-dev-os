{ config, pkgs, lib, ... }:

{
  options.nixpi = {
    username = lib.mkOption {
      type = lib.types.str;
      default = "nixpi";
      description = "Primary user account name";
    };
    sshKeys = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "SSH public keys for the primary user";
    };
    extensionsPath = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Absolute path to a directory of pi extension subdirectories (each with an index.ts). Empty = disabled.";
    };
    skillsPath = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Absolute path to a directory of pi skill subdirectories (each with a SKILL.md). Empty = disabled.";
    };
    rolesPath = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Absolute path to a directory of pi role files (each a *.md role). Empty = disabled.";
    };

  };

  config =
    let
      cfg = config.nixpi;
    in
    {
      boot.loader.systemd-boot.enable = true;
      boot.loader.efi.canTouchEfiVariables = true;

      networking.hostName = "nixos";
      networking.networkmanager.enable = true;
      networking.firewall.allowedTCPPorts = [ 22222 ];

      services.openssh = {
        enable = true;
        openFirewall = false;
        ports = [ 22222 ];
        settings = {
          KbdInteractiveAuthentication = false;
          PasswordAuthentication = false;
          PermitRootLogin = "no";
          X11Forwarding = false;
          AllowTcpForwarding = "yes";
          MaxAuthTries = 3;
          LoginGraceTime = 30;
          ClientAliveInterval = 300;
          ClientAliveCountMax = 2;
        };
      };

      services.fail2ban = {
        enable = true;
        maxretry = 3;
        bantime = "1h";
        ignoreIP = [ "127.0.0.1/8" ];
      };

      time.timeZone = "Europe/Bucharest";

      i18n.defaultLocale = "en_US.UTF-8";
      i18n.extraLocaleSettings = {
        LC_ADDRESS = "ro_RO.UTF-8";
        LC_IDENTIFICATION = "ro_RO.UTF-8";
        LC_MEASUREMENT = "ro_RO.UTF-8";
        LC_MONETARY = "ro_RO.UTF-8";
        LC_NAME = "ro_RO.UTF-8";
        LC_NUMERIC = "ro_RO.UTF-8";
        LC_PAPER = "ro_RO.UTF-8";
        LC_TELEPHONE = "ro_RO.UTF-8";
        LC_TIME = "ro_RO.UTF-8";
      };

      services.xserver.xkb = {
        layout = "us";
        variant = "";
      };

      users.users.${cfg.username} = {
        isNormalUser = true;
        description = cfg.username;
        openssh.authorizedKeys.keys = cfg.sshKeys;
        extraGroups = [
          "networkmanager"
          "wheel"
        ];
        packages = with pkgs; [ ];
      };

      security.sudo.wheelNeedsPassword = false;

      nixpkgs.config.allowUnfree = true;
      nix.settings.experimental-features = [
        "nix-command"
        "flakes"
      ];

      environment.sessionVariables = {
        PI_SKIP_VERSION_CHECK = "1";
        PI_TELEMETRY = "0";
      };

      environment.systemPackages = with pkgs; [
        # Languages
        nodejs_24 # latest Node.js LTS (24.x)
        go_1_26 # latest Go (1.26.x)
        # Latest Python 3 (3.14.x) with pip bundled, so both `python3 -m pip`
        # and the `pip`/`pip3` commands work out of the box.
        (python314.withPackages (p: [ p.pip ]))

        # Rust SDK (nixpkgs stable toolchain — works with zero configuration).
        # NOTE: do not add `rustup` here alongside these; its rustc/rustdoc
        # proxy shims win the profile symlink collision and break `rustc` until a
        # default toolchain is configured. Add `rustup` on its own if you need to
        # manage nightly/multiple toolchains, then run `rustup default stable`.
        rustc # compiler
        cargo # build tool and package manager
        clippy # linter
        rustfmt # formatter
        rust-analyzer # language server

        # Native build helpers for Rust crates and Python C extensions
        gcc
        gnumake
        pkg-config
        openssl

        # Tooling
        nixd
        nixfmt
        git
        gh
      ];

      # Symlink all pi extensions from nixpi.extensionsPath into pi's global
      # extensions directory so they are available in every session.
      system.userActivationScripts.pi-extensions = lib.mkIf (cfg.extensionsPath != "") ''
        if [ "$USER" = "${cfg.username}" ]; then
          ext_dst="$HOME/.pi/agent/extensions"
          mkdir -p "$ext_dst"
          for dir in "${cfg.extensionsPath}"/*/; do
            [ -f "$dir/index.ts" ] || continue
            name="$(basename "$dir")"
            ln -sfn "$dir" "$ext_dst/$name"
          done
        fi
      '';

      # Symlink all pi skills from nixpi.skillsPath into pi's global skills
      # directory so they are available in every session.
      system.userActivationScripts.pi-skills = lib.mkIf (cfg.skillsPath != "") ''
        if [ "$USER" = "${cfg.username}" ]; then
          skills_dst="$HOME/.pi/agent/skills"
          mkdir -p "$skills_dst"
          for dir in "${cfg.skillsPath}"/*/; do
            [ -f "$dir/SKILL.md" ] || continue
            name="$(basename "$dir")"
            ln -sfn "$dir" "$skills_dst/$name"
          done
        fi
      '';

      # Symlink all pi roles from nixpi.rolesPath into pi's global agents
      # directory so the subagent tool can resolve them in every repository.
      system.userActivationScripts.pi-roles = lib.mkIf (cfg.rolesPath != "") ''
        if [ "$USER" = "${cfg.username}" ]; then
          roles_dst="$HOME/.pi/agent/agents"
          mkdir -p "$roles_dst"
          for file in "${cfg.rolesPath}"/*.md; do
            [ -f "$file" ] || continue
            name="$(basename "$file")"
            ln -sfn "$file" "$roles_dst/$name"
          done
        fi
      '';

      system.stateVersion = "26.05";
    };
}
