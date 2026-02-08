---
summary: "Complete macOS app setup guide with menu bar, voice features, and native integration"
read_when:
  - You want the native macOS app experience
  - You want voice wake words and menu bar integration
  - First time macOS setup
title: "macOS App Quick Start"
---

# macOS App Quick Start

Get the full native macOS experience with OpenClaw running from your menu bar, complete with voice wake words and natural voice responses.

## What You Get

- **Native macOS Menu Bar App** - Quick access from the top bar
- **Voice Wake Words** - Activate with "Hey Claw" or custom phrases
- **Natural Voice Responses** - Human-like voices via ElevenLabs or OpenAI
- **Push-to-Talk** - Hold a hotkey to speak your command
- **Canvas Mode** - Interactive visual responses
- **System Integration** - Native notifications and settings

## Installation

### Option 1: Install from Release (Recommended)

1. Download the latest `.dmg` from [GitHub Releases](https://github.com/openclaw/openclaw/releases)
2. Open the `.dmg` file
3. Drag `OpenClaw.app` to your Applications folder
4. Launch OpenClaw from Applications or Spotlight

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Install dependencies
pnpm install

# Build and run the macOS app
scripts/restart-mac.sh
```

The app will appear in your menu bar with the 🦞 lobster icon.

## Initial Setup

### 1. Launch the App

Click the OpenClaw icon in your menu bar. The app will guide you through:

- **Model Provider Setup** - Connect to Anthropic (Claude) or OpenAI
- **Gateway Configuration** - Sets up the local gateway service
- **Permissions** - Microphone access for voice features

### 2. Configure Voice Features

#### Natural Voice (ElevenLabs - Recommended)

For the most natural, human-like voice:

1. Get an API key from [ElevenLabs](https://elevenlabs.io/)
2. Open OpenClaw Settings → **General**
3. Add your configuration:

```json5
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "your-elevenlabs-api-key",
        "voiceId": "pMsXgVXv3BLzUgSXRplE", // Rachel voice
        "modelId": "eleven_multilingual_v2",
        "voiceSettings": {
          "stability": 0.5,
          "similarityBoost": 0.75,
          "style": 0.0,
          "speed": 1.0
        }
      }
    }
  }
}
```

**Popular ElevenLabs Voices:**
- `pMsXgVXv3BLzUgSXRplE` - Rachel (warm, conversational)
- `21m00Tcm4TlvDq8ikWAM` - Rachel (alternative)
- `EXAVITQu4vr4xnSDxMaL` - Bella (young, upbeat)
- `ErXwobaYiN019PkySvjV` - Antoni (well-rounded male)
- `MF3mGyEYCl7XYWbV9V6O` - Elli (emotional range)

#### Alternative: OpenAI TTS

For a simpler setup with good quality:

```json5
{
  "messages": {
    "tts": {
      "provider": "openai",
      "auto": "always",
      "openai": {
        "voice": "nova", // alloy, echo, fable, onyx, nova, shimmer
        "model": "gpt-4o-mini-tts"
      }
    }
  }
}
```

#### Free Option: Edge TTS

No API key required, but less natural:

```json5
{
  "messages": {
    "tts": {
      "provider": "edge",
      "auto": "always",
      "edge": {
        "enabled": true,
        "voice": "en-US-MichelleNeural"
      }
    }
  }
}
```

### 3. Enable Voice Wake Words

1. Open OpenClaw Settings → **Voice Wake**
2. Configure your wake phrase (default: "Hey Claw")
3. Adjust sensitivity and timeout settings
4. Grant microphone permissions when prompted

Test your setup by saying your wake phrase and giving a command!

### 4. Configure Push-to-Talk (Optional)

1. Go to Settings → **Voice Wake**
2. Enable "Push to Talk"
3. Set your hotkey (e.g., `Option + Space`)
4. Hold the hotkey and speak your command

## Menu Bar Features

Click the lobster icon in your menu bar to access:

- **Recent Sessions** - Quick access to recent conversations
- **Quick Commands** - Send common requests
- **Status** - Gateway health and current activity
- **Settings** - Full configuration access
- **Canvas** - Open interactive canvas window

## Voice Commands Examples

Once voice is configured, try:

- "Hey Claw, what's the weather?"
- "Hey Claw, summarize my last email"
- "Hey Claw, create a todo list for today"
- "Hey Claw, write a poem about lobsters"

## Troubleshooting

### Voice Not Working

1. **Check Microphone Permissions**
   ```bash
   # Grant permissions in System Settings → Privacy & Security → Microphone
   ```

2. **Verify TTS Configuration**
   ```bash
   openclaw config get messages.tts
   ```

3. **Test Audio Output**
   - Ensure your speakers/headphones are working
   - Check macOS Sound settings

### Gateway Connection Issues

1. **Check Gateway Status**
   ```bash
   openclaw gateway status
   ```

2. **Restart Gateway**
   - Click OpenClaw menu bar icon → Quit
   - Relaunch OpenClaw app

3. **View Logs**
   ```bash
   ./scripts/clawlog.sh --tail
   ```

### App Not Appearing in Menu Bar

1. **Check if Running**
   ```bash
   ps aux | grep OpenClaw
   ```

2. **Rebuild and Restart**
   ```bash
   scripts/restart-mac.sh
   ```

## Advanced Configuration

### Custom Voice Settings

Fine-tune ElevenLabs voice characteristics:

```json5
{
  "messages": {
    "tts": {
      "elevenlabs": {
        "voiceSettings": {
          "stability": 0.5,        // 0.0-1.0: Lower = more expressive
          "similarityBoost": 0.75, // 0.0-1.0: Voice consistency
          "style": 0.0,            // 0.0-1.0: Style exaggeration
          "speed": 1.0             // 0.25-4.0: Speaking speed
        }
      }
    }
  }
}
```

### Voice Wake Customization

```json5
{
  "voiceWake": {
    "triggers": ["Hey Claw", "OpenClaw", "Lobster"],
    "sensitivity": 0.5,  // 0.0-1.0
    "timeout": 5000      // ms to wait after wake word
  }
}
```

## Next Steps

- [Voice Call Plugin](/plugins/voice-call) - Make and receive phone calls
- [Canvas Mode](/platforms/mac/canvas) - Interactive visual interface
- [Channels](/channels) - Connect WhatsApp, Telegram, Discord, etc.
- [Skills](/skills) - Extend capabilities with custom plugins

## Resources

- [macOS Platform Guide](/platforms/macos)
- [Voice Wake Documentation](/platforms/mac/voicewake)
- [Menu Bar Details](/platforms/mac/menu-bar)
- [TTS Configuration](/concepts/tts)
- [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
