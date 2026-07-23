{ config, pkgs, lib, ... }:

{
  options.nixpi = {
    username = lib.mkOption {
      type = lib.types.str;
      default = "nixpi";
      description = "Primary user account name";
    };
    sshKey = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "SSH public key for the primary user (empty = no key)";
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
    agentsPath = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Absolute path to a directory of herdr agent role files (*.md). Empty = disabled.";
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
      # Remote browsers must use HTTPS: WebCrypto is withheld from plain HTTP
      # non-localhost origins.
      networking.firewall.interfaces.netbird0.allowedTCPPorts = [
        443
        2222
      ];

      # Native OpenSSH uses a separate NetBird-only port so Android clients such as
      # Termux do not collide with NetBird's embedded SSH interception on port 22.
      services.openssh = {
        enable = true;
        openFirewall = false;
        ports = [ 2222 ];
        settings = {
          KbdInteractiveAuthentication = false;
          PasswordAuthentication = false;
          PermitRootLogin = "no";
          X11Forwarding = false;
        };
      };

      services.netbird.clients.default = {
        name = "netbird";
        interface = "netbird0";
        port = 51820;
        hardened = false;
        config = {
          ServerSSHAllowed = true;
          DisableSSHAuth = false;
          EnableSSHRoot = true;
          EnableSSHSFTP = false;
          EnableSSHLocalPortForwarding = false;
          EnableSSHRemotePortForwarding = false;
        };
        login = {
          enable = true;
          setupKeyFile = "/etc/netbird/setup-key";
        };
      };

      # The setup key is needed only for initial enrollment, not normal startup.
      systemd.services.netbird-login.unitConfig.ConditionPathExists = "/etc/netbird/setup-key";

      services.caddy = {
        enable = true;
        # Client devices trust this CA explicitly; the sandboxed Caddy service must
        # not try (and fail) to modify the development host's system trust store.
        globalConfig = "skip_install_trust";
        virtualHosts."nixos.netbird.cloud".extraConfig = ''
          tls internal

          # The root certificate is public material. Serving it here gives a new
          # NetBird client a bounded bootstrap path; the CA private key remains in
          # Caddy's protected state directory.
          handle /nixpi-dev-ca.crt {
            root * /var/lib/caddy/.local/share/caddy/pki/authorities/local
            rewrite * /root.crt
            header Content-Type application/x-x509-ca-cert
            header Content-Disposition "attachment; filename=nixpi-dev-ca.crt"
            file_server
          }

          handle {
            reverse_proxy 127.0.0.1:8080
          }
        '';
      };

      systemd.services.caddy = {
        after = [ "netbird.service" ];
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

      users.groups."${cfg.username}-secrets" = { };

      users.users.${cfg.username} = {
        isNormalUser = true;
        description = cfg.username;
        openssh.authorizedKeys.keys =
          lib.mkIf (cfg.sshKey != "") [ cfg.sshKey ];
        extraGroups = [
          "${cfg.username}-secrets"
          "networkmanager"
          "wheel"
        ];
        packages = with pkgs; [ ];
      };

      systemd.tmpfiles.rules = [
        "d /etc/${cfg.username} 0750 root ${cfg.username}-secrets - -"
        "f /etc/${cfg.username}/netbird.env 0640 root ${cfg.username}-secrets - -"
      ];

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

      # Symlink herdr agent role files from nixpi.agentsPath into pi's global
      # agents directory so they are discoverable in every project.
      system.userActivationScripts.pi-agents = lib.mkIf (cfg.agentsPath != "") ''
        if [ "$USER" = "${cfg.username}" ]; then
          agents_dst="$HOME/.pi/agent/agents"
          mkdir -p "$agents_dst"
          for file in "${cfg.agentsPath}"/*.md; do
            [ -f "$file" ] || continue
            name="$(basename "$file")"
            ln -sfn "$file" "$agents_dst/$name"
          done
        fi
      '';

      system.stateVersion = "26.05";
    };
}
