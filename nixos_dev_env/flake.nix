{
  description = "nixpi-dev-os NixOS configuration";

  nixConfig = {
    extra-substituters = [ "https://cache.numtide.com" ];
    extra-trusted-public-keys = [ "niks3.numtide.com-1:DTx8wZduET09hRmMtKdQDxNNthLQETkc/yaX7M4qK0g=" ];
  };

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    llm-agents.url = "github:numtide/llm-agents.nix";
    herdr = {
      url = "github:ogulcancelik/herdr/v0.7.5";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      llm-agents,
      herdr,
      ...
    }:
    {
      nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          (
            { pkgs, config, ... }:
            let
              system = pkgs.stdenv.hostPlatform.system;
              herdrPackage = herdr.packages.${system}.default;
            in
            {
              # Instance-specific overrides
              nixpi.username = "balaur";
              nixpi.sshKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPOkyb6k2hdZHcP2gPb24NEroog7e26xA3IKGKkcv8qe u0_a478@localhost";
              nixpi.extensionsPath = "/home/balaur/projects/nixpi-dev-os/pi_extensions";
              nixpi.skillsPath = "/home/balaur/projects/nixpi-dev-os/pi_skills";

              environment.systemPackages = [
                llm-agents.packages.${system}.pi
                herdrPackage
              ];

              # Keep Herdr's Pi lifecycle/session integration in sync with the
              # pinned Herdr release. Preserve any user-customized config.
              system.userActivationScripts.herdr = ''
                if [ "$USER" = "${config.nixpi.username}" ]; then
                  config_dir="$HOME/.config/herdr"
                  config_file="$config_dir/config.toml"
                  mkdir -p "$config_dir"

                  if [ ! -e "$config_file" ]; then
                    cat > "$config_file" <<'EOF'
                onboarding = false

                [terminal]
                default_shell = "/run/current-system/sw/bin/bash"
                new_cwd = "follow"

                [update]
                version_check = false
                manifest_check = true

                [ui.toast]
                delivery = "terminal"

                [ui.sound]
                enabled = false

                [session]
                resume_agents_on_restore = true
                EOF
                    chmod 0600 "$config_file"
                  fi

                  ${herdrPackage}/bin/herdr integration install pi
                fi
              '';
            }
          )
          ./configuration.nix
          ./hardware-configuration.nix
        ];
      };
    };
}
