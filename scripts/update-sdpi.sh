#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
curl -fsSL https://sdpi-components.dev/releases/v4/sdpi-components.js -o com.vcamapp.vcam.sdPlugin/ui/sdpi-components.js
head -n 4 com.vcamapp.vcam.sdPlugin/ui/sdpi-components.js
