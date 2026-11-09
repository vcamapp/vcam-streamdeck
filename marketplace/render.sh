#!/bin/sh
# Renders the Marketplace app icon and thumbnail into .build/marketplace, and the plugin icon that Stream Deck
# shows in its plugin list. The icon is VCam's app icon, rendered from VCamIcon.icon with Icon Composer.
set -eu
cd "$(dirname "$0")"
ictool="$(xcode-select -p)/../Applications/Icon Composer.app/Contents/Executables/ictool"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
out="../.build/marketplace"
icons="../com.vcamapp.vcam.sdPlugin/imgs/plugin"
mkdir -p "$out"

"$ictool" VCamIcon.icon --export-image --output-file "$out/icon-1024.png" \
	--platform macOS --rendition Default --width 1024 --height 1024 --scale 1 >/dev/null
magick "$out/icon-1024.png" -resize 288x288 "$out/app-icon.png"
magick "$out/icon-1024.png" -resize 512x512 "$icons/marketplace@2x.png"
magick "$out/icon-1024.png" -resize 256x256 "$icons/marketplace.png"

"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
	--window-size=1920,960 --screenshot="$out/thumbnail.png" "file://$PWD/thumbnail.html" >/dev/null 2>&1

echo "$out/app-icon.png"
echo "$out/thumbnail.png"
