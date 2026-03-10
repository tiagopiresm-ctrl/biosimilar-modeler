#!/usr/bin/env bash
export HOME=/Users/tiagomarquesmartinspires
export PATH="$HOME/.local/node/bin:$PATH"
cd /tmp/biosimilar-modeler
exec npx vite --port 5174
