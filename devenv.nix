{ pkgs, lib, ... }:
let
  runtimeLibs = [
    pkgs.stdenv.cc.cc.lib
  ];
in
{
  packages = runtimeLibs;

  env = {
    LD_LIBRARY_PATH = lib.makeLibraryPath runtimeLibs;
  };
}
