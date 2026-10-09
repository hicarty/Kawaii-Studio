#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$ROOT/Builds/cmake}"
CONFIG="${CONFIG:-Release}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

PKG_OUT="${PKG_OUT:-$ROOT/dist/Kawaii Studio Installer.pkg}"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"
NOTARIZE="${NOTARIZE:-0}"

usage() {
  echo "Packages the VST3 and AU plugin builds into a macOS .pkg installer."
  echo ""
  echo "Usage: $0 [options]"
  echo "  BUILD_DIR=path      CMake build directory      (default: Builds/cmake)"
  echo "  CONFIG=Release|Debug                            (default: Release)"
  echo "  PKG_OUT=path        Output .pkg path           (default: dist/Kawaii Studio Installer.pkg)"
  echo "  SIGN_IDENTITY=name  codesign identity (e.g. 'Developer ID Application: X')"
  echo "  NOTARIZE=1          staple the signed package (requires APPLE_ID/TEAM_ID/PASSWORD env)"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

echo "==> Configuring CMake ($CONFIG)"
cmake -S "$ROOT" -B "$BUILD_DIR" -G Ninja \
  -DCMAKE_BUILD_TYPE="$CONFIG" \
  -DJUCE_COPY_PLUGIN_AFTER_BUILD=OFF

echo "==> Building $CONFIG"
cmake --build "$BUILD_DIR" --config "$CONFIG"

ART="$BUILD_DIR/KawaiiStudio_artefacts/$CONFIG"
VST3="$ART/VST3/Kawaii Studio.vst3"
AU="$ART/AU/Kawaii Studio.component"

for path in "$VST3" "$AU"; do
  if [[ ! -d "$path" ]]; then
    echo "Build artefact not found: $path" >&2
    exit 1
  fi
done

STAGE_VST3="$STAGE/Library/Audio/Plug-Ins/VST3"
STAGE_AU="$STAGE/Library/Audio/Plug-Ins/Components"
mkdir -p "$STAGE_VST3" "$STAGE_AU"

echo "==> Staging plugin bundles"
cp -R "$VST3" "$STAGE_VST3/"
cp -R "$AU" "$STAGE_AU/"

if [[ -n "$SIGN_IDENTITY" ]]; then
  echo "==> Codesigning with '$SIGN_IDENTITY'"
  codesign --force --deep --verify --verbose \
    --options runtime --timestamp \
    --sign "$SIGN_IDENTITY" "$STAGE_VST3/Kawaii Studio.vst3"
  codesign --force --deep --verify --verbose \
    --options runtime --timestamp \
    --sign "$SIGN_IDENTITY" "$STAGE_AU/Kawaii Studio.component"
fi

mkdir -p "$(dirname "$PKG_OUT")"
echo "==> Building package -> $PKG_OUT"
pkgbuild --root "$STAGE" \
  --identifier com.kawaiistudio.kawaiistudio \
  --version 1.0.0 \
  --install-location / \
  "$PKG_OUT"

echo "==> Package summary"
pkgutil --payload-files "$PKG_OUT" | sed 's/^/    /'

if [[ -n "$SIGN_IDENTITY" ]]; then
  echo "==> Signing package"
  productsign --sign "$SIGN_IDENTITY" "$PKG_OUT" "$PKG_OUT.signed"
  mv "$PKG_OUT.signed" "$PKG_OUT"
fi

if [[ "$NOTARIZE" == "1" && -n "$SIGN_IDENTITY" ]]; then
  : "${APPLE_ID:?APPLE_ID required for notarization}"
  : "${APPLE_TEAM_ID:?APPLE_TEAM_ID required for notarization}"
  : "${APPLE_PASSWORD:?APPLE_PASSWORD required for notarization}"
  echo "==> Submitting for notarization"
  xcrun notarytool submit "$PKG_OUT" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_PASSWORD" \
    --wait
  xcrun stapler staple "$PKG_OUT"
fi

echo "==> Done: $PKG_OUT"