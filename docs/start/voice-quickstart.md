---
summary: "Complete guide to natural voice features - wake words, TTS, and voice calls"
read_when:
  - You want voice interaction with OpenClaw
  - You want human-like voice responses
  - Setting up voice wake words or voice calls
title: "Voice Features Quick Start"
---

# Voice Features Quick Start

Transform OpenClaw into a voice-powered assistant with natural, human-like speech. This guide covers everything from wake words to realistic voice generation.

## What You Get

- 🎙️ **Voice Wake Words** - Activate with "Hey Claw" (hands-free)
- 🗣️ **Natural TTS** - Human-like voice responses (ElevenLabs, OpenAI)
- 📞 **Voice Calls** - Make and receive phone calls (Twilio, Telnyx)
- ⌨️ **Push-to-Talk** - Hold a hotkey to speak
- 🔊 **Audio Messages** - Process voice notes from messaging apps
- 🌍 **Multi-Language** - Support for 29+ languages

## Quick Start: Natural Voice Setup

### 1. Choose Your Voice Provider

| Provider       | Quality                      | Cost        | Setup  |
| -------------- | ---------------------------- | ----------- | ------ |
| **ElevenLabs** | ⭐⭐⭐⭐⭐ Extremely natural | ~$5-22/mo   | Medium |
| **OpenAI**     | ⭐⭐⭐⭐ Very good           | Pay-per-use | Easy   |
| **Edge TTS**   | ⭐⭐⭐ Good enough           | Free        | Easy   |

### 2. Configure Your Chosen Provider

<Tabs>
  <Tab title="ElevenLabs (Best Quality)">
    **Why ElevenLabs?**
    - Most human-like voices available
    - Emotional range and expressiveness
    - Multiple accents and languages
    - Voice cloning available

    **Setup:**

    1. Sign up at [ElevenLabs.io](https://elevenlabs.io/)
    2. Get your API key from [Profile → API Keys](https://elevenlabs.io/api)
    3. Browse [Voice Library](https://elevenlabs.io/voice-library) for voices
    4. Configure OpenClaw:

    ```bash
    openclaw config set messages.tts.provider elevenlabs
    openclaw config set messages.tts.auto always
    openclaw config set messages.tts.elevenlabs.apiKey "YOUR_API_KEY"
    openclaw config set messages.tts.elevenlabs.voiceId "pMsXgVXv3BLzUgSXRplE"
    ```

    **Or edit config directly** (`~/.openclaw/settings/config.json`):

    ```json5
    {
      "messages": {
        "tts": {
          "provider": "elevenlabs",
          "auto": "always",
          "elevenlabs": {
            "apiKey": "your-api-key-here",
            "voiceId": "pMsXgVXv3BLzUgSXRplE", // Rachel
            "modelId": "eleven_multilingual_v2",
            "voiceSettings": {
              "stability": 0.5,        // 0.0-1.0: Lower = more varied
              "similarityBoost": 0.75, // 0.0-1.0: Voice consistency
              "style": 0.0,            // 0.0-1.0: Style exaggeration
              "speed": 1.0,            // 0.25-4.0: Speaking speed
              "useSpeakerBoost": true
            }
          }
        }
      }
    }
    ```

    **Popular Voice IDs:**
    - `pMsXgVXv3BLzUgSXRplE` - Rachel (warm female, American)
    - `21m00Tcm4TlvDq8ikWAM` - Rachel (professional female)
    - `ErXwobaYiN019PkySvjV` - Antoni (male, well-rounded)
    - `EXAVITQu4vr4xnSDxMaL` - Bella (young, energetic)
    - `MF3mGyEYCl7XYWbV9V6O` - Elli (female, emotional)
    - `TxGEqnHWrfWFTfGW9XjX` - Josh (young male)
    - `VR6AewLTigWG4xSOukaG` - Arnold (masculine, strong)
    - `jBpfuIE2acCO8z3wKNLl` - Gigi (childish, animated)
    - `jsCqWAovK2LkecY7zXl4` - Freya (young female)

  </Tab>
  <Tab title="OpenAI (Good Quality)">
    **Why OpenAI?**
    - Excellent quality and reliability
    - Integrated with ChatGPT ecosystem
    - Simple pay-per-use pricing
    - Fast generation

    **Setup:**

    ```bash
    openclaw config set messages.tts.provider openai
    openclaw config set messages.tts.auto always
    openclaw config set messages.tts.openai.voice nova
    ```

    **Or edit config**:

    ```json5
    {
      "messages": {
        "tts": {
          "provider": "openai",
          "auto": "always",
          "openai": {
            "voice": "nova",  // alloy, echo, fable, onyx, nova, shimmer
            "model": "gpt-4o-mini-tts"
          }
        }
      }
    }
    ```

    **Voice Options:**
    - `alloy` - Neutral, balanced
    - `echo` - Male, clear
    - `fable` - British accent
    - `onyx` - Deep male
    - `nova` - Female, energetic (recommended)
    - `shimmer` - Female, soft

  </Tab>
  <Tab title="Edge TTS (Free)">
    **Why Edge TTS?**
    - Completely free
    - No API key needed
    - Decent quality for basic use
    - Good language support

    **Setup:**

    ```bash
    openclaw config set messages.tts.provider edge
    openclaw config set messages.tts.auto always
    openclaw config set messages.tts.edge.enabled true
    ```

    **Or edit config**:

    ```json5
    {
      "messages": {
        "tts": {
          "provider": "edge",
          "auto": "always",
          "edge": {
            "enabled": true,
            "voice": "en-US-MichelleNeural",
            "rate": "+0%",
            "pitch": "+0Hz",
            "volume": "+0%"
          }
        }
      }
    }
    ```

    **Popular Edge Voices:**
    - `en-US-MichelleNeural` - Female, American
    - `en-US-EricNeural` - Male, American
    - `en-GB-SoniaNeural` - Female, British
    - `en-AU-NatashaNeural` - Female, Australian
    - `es-ES-ElviraNeural` - Female, Spanish
    - `fr-FR-DeniseNeural` - Female, French

    List all available voices:
    ```bash
    npx edge-tts --list-voices
    ```

  </Tab>
</Tabs>

### 3. Test Your Voice

```bash
# Send a test message with voice
openclaw agent --message "Test the voice system with a short sentence" --thinking low

# The response will be spoken aloud (if configured correctly)
```

## Voice Wake Words (macOS/iOS)

Activate OpenClaw hands-free with a wake phrase.

### Enable Voice Wake

<Tabs>
  <Tab title="macOS App">
    1. Launch OpenClaw from the menu bar
    2. Click Settings → **Voice Wake**
    3. Enable "Voice Wake"
    4. Set your trigger phrase (default: "Hey Claw")
    5. Grant microphone permission when prompted
    6. Test by saying your wake phrase!
  </Tab>
  <Tab title="Configuration File">
    Edit `~/.openclaw/settings/voicewake.json`:

    ```json5
    {
      "triggers": [
        "Hey Claw",
        "OpenClaw",
        "Hey Lobster"
      ]
    }
    ```

    Or use the CLI:
    ```bash
    openclaw config set voiceWake.triggers '["Hey Claw","OpenClaw"]'
    ```

  </Tab>
</Tabs>

### Wake Word Settings

Fine-tune wake word behavior:

```json5
{
  voiceWake: {
    triggers: ["Hey Claw"],
    sensitivity: 0.5, // 0.0-1.0: Higher = more sensitive
    timeout: 5000, // ms: How long to listen after wake
    beepOnActivation: true, // Play sound when activated
  },
}
```

### Voice Wake Commands

Once activated, you can say:

- "What's the weather?"
- "Summarize my emails"
- "Create a todo list"
- "Tell me a joke"
- "What's on my calendar today?"

The assistant will respond with voice!

## Push-to-Talk (macOS)

Prefer a hotkey? Configure push-to-talk:

1. Settings → **Voice Wake**
2. Enable "Push to Talk"
3. Set your hotkey (e.g., `Option + Space`)
4. Hold the hotkey and speak

## Voice Calls (Phone Integration)

Make and receive phone calls with OpenClaw.

### Install Voice Call Plugin

```bash
openclaw plugins install @openclaw/voice-call
```

### Configure a Voice Provider

<Tabs>
  <Tab title="Twilio">
    1. Sign up at [Twilio.com](https://www.twilio.com/)
    2. Get a phone number
    3. Get Account SID and Auth Token
    4. Configure:

    ```json5
    {
      "plugins": {
        "entries": {
          "voice-call": {
            "config": {
              "provider": "twilio",
              "fromNumber": "+15551234567",
              "twilio": {
                "accountSid": "ACxxxxxxxxxxxxxxx",
                "authToken": "your_auth_token"
              },
              "serve": {
                "port": 3334
              },
              "publicUrl": "https://your-domain.com/voice/webhook"
            }
          }
        }
      }
    }
    ```

  </Tab>
  <Tab title="Telnyx">
    1. Sign up at [Telnyx.com](https://telnyx.com/)
    2. Get a phone number
    3. Get API Key
    4. Configure:

    ```json5
    {
      "plugins": {
        "entries": {
          "voice-call": {
            "config": {
              "provider": "telnyx",
              "fromNumber": "+15551234567",
              "telnyx": {
                "apiKey": "your_api_key"
              }
            }
          }
        }
      }
    }
    ```

  </Tab>
</Tabs>

### Make a Call

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw!"
```

### Receive Calls

Configure your phone provider to forward calls to OpenClaw's webhook URL.

See [Voice Call Plugin Documentation](/plugins/voice-call) for complete setup.

## Voice Message Modes

Control when voice responses are generated:

```json5
{
  messages: {
    tts: {
      auto: "always", // Options: off, always, inbound, tagged
      mode: "final", // Options: final, all
    },
  },
}
```

**Auto Modes:**

- `off` - Never generate voice (manual only)
- `always` - Generate voice for all responses
- `inbound` - Only when replying to voice messages
- `tagged` - Only when message includes `[[tts:...]]` tags

**Mode:**

- `final` - Only speak the final answer (recommended)
- `all` - Speak all intermediate steps too

## Advanced Voice Tuning

### ElevenLabs Fine-Tuning

```json5
{
  messages: {
    tts: {
      elevenlabs: {
        voiceSettings: {
          // Voice consistency (0.0 = varied, 1.0 = consistent)
          stability: 0.5,

          // How closely to match the original voice
          similarityBoost: 0.75,

          // Amplify speaking style (0.0 = neutral, 1.0 = exaggerated)
          style: 0.0,

          // Speaking speed (0.25 = slow, 4.0 = very fast)
          speed: 1.0,

          // Enhance clarity
          useSpeakerBoost: true,
        },

        // Multilingual model (supports 29+ languages)
        modelId: "eleven_multilingual_v2",

        // Optional: Consistent voice across sessions
        seed: 12345,

        // Text normalization (auto, on, off)
        applyTextNormalization: "auto",

        // Force specific language
        languageCode: "en",
      },
    },
  },
}
```

### Voice Profiles (Per-Channel)

Different voices for different channels:

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      auto: "always",
    },
  },
  channels: {
    telegram: {
      tts: {
        elevenlabs: {
          voiceId: "pMsXgVXv3BLzUgSXRplE", // Rachel for Telegram
        },
      },
    },
    discord: {
      tts: {
        elevenlabs: {
          voiceId: "ErXwobaYiN019PkySvjV", // Antoni for Discord
        },
      },
    },
  },
}
```

### Dynamic Voice Changes

Embed voice commands in responses:

```
[[tts:provider=elevenlabs voiceId=different-voice-id]]
This text will use a different voice.
[[tts:speed=1.2]]
This will be spoken faster.
```

## Audio Input (Voice Notes)

OpenClaw automatically transcribes voice notes from:

- WhatsApp voice messages
- Telegram voice messages
- Discord voice messages
- Any audio attachment

**Configure transcription:**

```json5
{
  tools: {
    media: {
      audio: {
        transcription: {
          provider: "openai", // or "anthropic"
          autoTranscribe: true,
        },
      },
    },
  },
}
```

## Multi-Language Support

### ElevenLabs Languages

Supports 29+ languages including:

- English (US, UK, AU, etc.)
- Spanish, French, German
- Italian, Portuguese, Polish
- Hindi, Arabic, Japanese
- Chinese, Korean, and more

Set with `languageCode`:

```json5
{
  elevenlabs: {
    languageCode: "es", // Spanish
  },
}
```

### Edge TTS Languages

List available voices for your language:

```bash
npx edge-tts --list-voices | grep "es-ES"  # Spanish
npx edge-tts --list-voices | grep "fr-FR"  # French
npx edge-tts --list-voices | grep "ja-JP"  # Japanese
```

## Troubleshooting

### No Audio Output

1. **Check TTS configuration:**

   ```bash
   openclaw config get messages.tts
   ```

2. **Verify API key:**

   ```bash
   # ElevenLabs
   openclaw config get messages.tts.elevenlabs.apiKey
   ```

3. **Test TTS directly:**

   ```bash
   openclaw agent --message "Testing voice output" --thinking low
   ```

4. **Check system audio:**
   - Ensure speakers/headphones are connected
   - Check volume levels
   - Test with another app

### Voice Wake Not Triggering

1. **Check microphone permissions:**
   - macOS: System Settings → Privacy & Security → Microphone
   - Enable for OpenClaw

2. **Verify configuration:**

   ```bash
   openclaw config get voiceWake
   ```

3. **Adjust sensitivity:**

   ```json5
   {
     voiceWake: {
       sensitivity: 0.7, // Try higher if not triggering
     },
   }
   ```

4. **Check trigger phrases:**
   - Speak clearly
   - Reduce background noise
   - Try different wake words

### Poor Voice Quality

1. **Try a different voice:**
   - ElevenLabs: Browse [Voice Library](https://elevenlabs.io/voice-library)
   - OpenAI: Try `nova` or `alloy`

2. **Adjust voice settings (ElevenLabs):**

   ```json5
   {
     stability: 0.3, // More expressive
     similarityBoost: 0.8, // More consistent
   }
   ```

3. **Check network connection:**
   - Slow connection = choppy audio
   - Use wired connection if possible

### API Costs Too High

1. **Use auto mode wisely:**

   ```json5
   {
     auto: "inbound", // Only reply with voice to voice messages
   }
   ```

2. **Switch to cheaper provider:**
   - Edge TTS is free
   - OpenAI is cheaper than ElevenLabs

3. **Limit text length:**
   ```json5
   {
     maxTextLength: 500, // Truncate long responses
   }
   ```

## Voice Feature Matrix

| Feature          | macOS | iOS | Android | Docker | Web |
| ---------------- | ----- | --- | ------- | ------ | --- |
| TTS (ElevenLabs) | ✅    | ✅  | ✅      | ✅     | ✅  |
| TTS (OpenAI)     | ✅    | ✅  | ✅      | ✅     | ✅  |
| TTS (Edge)       | ✅    | ✅  | ✅      | ✅     | ✅  |
| Voice Wake       | ✅    | ✅  | ✅      | ❌     | ❌  |
| Push-to-Talk     | ✅    | ✅  | ✅      | ❌     | ❌  |
| Voice Calls      | ✅    | ✅  | ✅      | ✅     | ❌  |
| Voice Notes      | ✅    | ✅  | ✅      | ✅     | ✅  |

## Next Steps

- [Voice Call Plugin](/plugins/voice-call) - Phone integration
- [TTS Configuration](/concepts/tts) - Advanced settings
- [macOS Voice Wake](/platforms/mac/voicewake) - Platform details
- [Audio Processing](/nodes/audio) - Voice note handling

## Resources

- [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
- [OpenAI TTS Guide](https://platform.openai.com/docs/guides/text-to-speech)
- [Edge TTS Voices](https://github.com/rany2/edge-tts#voice-list)
- [Voice Call Plugin](https://github.com/openclaw/openclaw/tree/main/extensions/voice-call)
