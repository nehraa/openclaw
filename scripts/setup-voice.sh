#!/usr/bin/env bash
#
# OpenClaw Voice Setup Helper
# Interactive configuration for natural voice features
#

set -euo pipefail

CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-$HOME/.openclaw}"
CONFIG_FILE="$CONFIG_DIR/settings/config.json"

cat <<'BANNER'

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎙️  OpenClaw Voice Setup                                    ║
║                                                               ║
║   Configure natural, human-like voice responses               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

BANNER

echo "Select your voice provider:"
echo ""
echo "  1) ElevenLabs (⭐⭐⭐⭐⭐ Most natural, ~\$5-22/mo)"
echo "  2) OpenAI (⭐⭐⭐⭐ Very good, pay-per-use)"
echo "  3) Edge TTS (⭐⭐⭐ Good, FREE)"
echo ""
read -p "Choice [1-3]: " provider_choice

case "$provider_choice" in
  1)
    PROVIDER="elevenlabs"
    cat <<'ELEVENLABS_INFO'

🎵 ElevenLabs Setup

You'll need:
  1. Account at https://elevenlabs.io/ (free tier available)
  2. API key from https://elevenlabs.io/api (Profile → API Keys)
  3. Voice ID (browse voices at https://elevenlabs.io/voice-library)

Popular voices:
  - pMsXgVXv3BLzUgSXRplE (Rachel - warm, conversational)
  - ErXwobaYiN019PkySvjV (Antoni - male, clear)
  - EXAVITQu4vr4xnSDxMaL (Bella - young, energetic)

ELEVENLABS_INFO

    read -p "Enter your ElevenLabs API key: " api_key
    read -p "Enter voice ID [pMsXgVXv3BLzUgSXRplE]: " voice_id
    voice_id="${voice_id:-pMsXgVXv3BLzUgSXRplE}"

    CONFIG=$(cat <<EOF
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "$api_key",
        "voiceId": "$voice_id",
        "modelId": "eleven_multilingual_v2",
        "voiceSettings": {
          "stability": 0.5,
          "similarityBoost": 0.75,
          "style": 0.0,
          "speed": 1.0,
          "useSpeakerBoost": true
        }
      }
    }
  }
}
EOF
)
    ;;

  2)
    PROVIDER="openai"
    cat <<'OPENAI_INFO'

🤖 OpenAI TTS Setup

Available voices:
  - alloy (neutral, balanced)
  - echo (male, clear)
  - fable (British accent)
  - onyx (deep male)
  - nova (female, energetic) ⭐ Recommended
  - shimmer (female, soft)

OPENAI_INFO

    read -p "Select voice [nova]: " voice
    voice="${voice:-nova}"

    CONFIG=$(cat <<EOF
{
  "messages": {
    "tts": {
      "provider": "openai",
      "auto": "always",
      "openai": {
        "voice": "$voice",
        "model": "gpt-4o-mini-tts"
      }
    }
  }
}
EOF
)
    ;;

  3)
    PROVIDER="edge"
    cat <<'EDGE_INFO'

🆓 Edge TTS Setup (Free)

Popular voices:
  - en-US-MichelleNeural (female, American)
  - en-US-EricNeural (male, American)
  - en-GB-SoniaNeural (female, British)
  - en-AU-NatashaNeural (female, Australian)

Full list: npx edge-tts --list-voices

EDGE_INFO

    read -p "Enter voice ID [en-US-MichelleNeural]: " voice
    voice="${voice:-en-US-MichelleNeural}"

    CONFIG=$(cat <<EOF
{
  "messages": {
    "tts": {
      "provider": "edge",
      "auto": "always",
      "edge": {
        "enabled": true,
        "voice": "$voice",
        "rate": "+0%",
        "pitch": "+0Hz"
      }
    }
  }
}
EOF
)
    ;;

  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "📝 Configuration generated:"
echo ""
echo "$CONFIG"
echo ""

mkdir -p "$(dirname "$CONFIG_FILE")"

# Merge with existing config if present
if [ -f "$CONFIG_FILE" ]; then
  read -p "Config file exists. Merge with existing? [Y/n] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    # Simple merge: append to existing (user should validate)
    echo "⚠️  Manual merge required. Backup created at ${CONFIG_FILE}.backup"
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
    echo ""
    echo "Add the following to your config at $CONFIG_FILE:"
    echo "$CONFIG"
    echo ""
    echo "Or replace the entire messages.tts section with the above."
  fi
else
  echo "$CONFIG" > "$CONFIG_FILE"
  echo "✅ Configuration saved to: $CONFIG_FILE"
fi

echo ""
cat <<'SUCCESS'

╔═══════════════════════════════════════════════════════════════╗
║   ✅ Voice Configuration Complete!                            ║
╚═══════════════════════════════════════════════════════════════╝

🧪 Test Your Voice:

   CLI:
     openclaw agent --message "Test the voice system" --thinking low

   macOS App:
     Say "Hey Claw, test the voice"

   Docker:
     docker compose run --rm openclaw-cli agent --message "Test voice" --thinking low

🎚️  Fine-Tuning (ElevenLabs):

   Adjust in config:
     stability:       0.0-1.0 (lower = more varied)
     similarityBoost: 0.0-1.0 (voice consistency)
     speed:           0.25-4.0 (speaking speed)

📚 Full Guide: https://docs.openclaw.ai/start/voice-quickstart

💬 Support: https://discord.gg/clawd

SUCCESS
