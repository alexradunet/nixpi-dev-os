{
  description = "nixpi-dev-os NixOS configuration";

  # Applied only for trusted-users (configured in configuration.nix) or after
  # manual per-build acceptance; see `man nix.conf` extra-substituters.
  nixConfig = {
    extra-substituters = [ "https://cache.numtide.com" ];
    extra-trusted-public-keys = [ "niks3.numtide.com-1:DTx8wZduET09hRmMtKdQDxNNthLQETkc/yaX7M4qK0g=" ];
  };

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    llm-agents.url = "github:numtide/llm-agents.nix";
    paseo.url = "github:getpaseo/paseo";
  };

  outputs =
    {
      nixpkgs,
      llm-agents,
      paseo,
      ...
    }:
    {
      nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          paseo.nixosModules.paseo
          (
            { pkgs, config, ... }:
            let
              system = pkgs.stdenv.hostPlatform.system;
            in
            {
              # Instance-specific overrides
              nixpi.username = "balaur";
              nixpi.sshKeys = [
                "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPOkyb6k2hdZHcP2gPb24NEroog7e26xA3IKGKkcv8qe u0_a478@localhost"
                "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFt+nhmaiEg0M2jcqfUVfOit/2tem32Tsu0FnszLjmYC alex@laptop"
              ];
              nixpi.extensionsPath = "/home/balaur/projects/nixpi-dev-os/pi";

              environment.systemPackages = [
                llm-agents.packages.${system}.pi
              ];
            }
          )
          ./configuration.nix
          ./hardware-configuration.nix
        ];
      };
    };
}
