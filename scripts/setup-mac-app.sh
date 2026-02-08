#!/usr/bin/env bash
#
# OpenClaw macOS App Quick Install
# Builds and launches the native macOS menu bar app
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cat <<'BANNER'

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🦞 OpenClaw macOS App Setup                                 ║
║                                                               ║
║   Building native menu bar app with:                          ║
║   ✅ Menu bar integration                                     ║
║   ✅ Voice wake words                                         ║
║   ✅ Natural voice responses                                  ║
║   ✅ Canvas mode                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

BANNER

echo "📦 Checking dependencies..."

# Check for Xcode Command Line Tools
if ! xcode-select -p &>/dev/null; then
  echo "❌ Xcode Command Line Tools not found"
  echo "   Install with: xcode-select --install"
  exit 1
fi

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found"
  echo "   Install from: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "❌ Node.js version 22 or higher required (found: $(node -v))"
  exit 1
fi

# Check for pnpm
if ! command -v pnpm &>/dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm
fi

echo "✅ Dependencies OK"
echo ""

cd "$PROJECT_ROOT"

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "🔨 Building UI..."
pnpm ui:build

echo ""
echo "🔨 Building core..."
pnpm build

echo ""
echo "🍎 Building macOS app..."
"$SCRIPT_DIR/package-mac-app.sh"

echo ""

cat <<'SUCCESS'

╔═══════════════════════════════════════════════════════════════╗
║   ✅ macOS App Built Successfully!                            ║
╚═══════════════════════════════════════════════════════════════╝

🎯 Launch OpenClaw:

   Option 1: Open from Finder
     Applications → OpenClaw.app

   Option 2: Launch from command line
     open dist/OpenClaw.app

   Option 3: Quick restart script
     scripts/restart-mac.sh

📱 Look for the lobster icon 🦞 in your menu bar!

🎙️  Setup Voice Features:

   1. Click the menu bar icon → Settings
   2. Configure voice provider (ElevenLabs recommended):

      {
        "messages": {
          "tts": {
            "provider": "elevenlabs",
            "auto": "always",
            "elevenlabs": {
              "apiKey": "YOUR_KEY",
              "voiceId": "pMsXgVXv3BLzUgSXRplE"
            }
          }
        }
      }

   3. Enable Voice Wake:
      Settings → Voice Wake → Enable
      Say: "Hey Claw, what's the weather?"

📚 Documentation:
   macOS Guide: https://docs.openclaw.ai/start/macos-app-quickstart
   Voice Guide: https://docs.openclaw.ai/start/voice-quickstart

💬 Support: https://discord.gg/clawd

SUCCESS

# Optionally launch the app
read -p "Launch OpenClaw now? [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
  echo "🚀 Launching OpenClaw..."
  open "$PROJECT_ROOT/dist/OpenClaw.app"
  echo "✅ Look for the 🦞 in your menu bar!"
fi
