---
summary: "Complete setup guide: macOS app + Docker + Natural voice in under 10 minutes"
read_when:
  - You want the ultimate OpenClaw experience
  - You want macOS app, Docker, and voice features
  - You're setting up OpenClaw for the first time
title: "Ultimate Quick Start"
---

# Ultimate Quick Start Guide

Get the complete OpenClaw experience: native macOS app with menu bar, containerized deployment, and natural human-like voice - all in under 10 minutes.

<Check>
This guide combines the best features of OpenClaw:
- 🍎 **macOS Menu Bar App** - Native experience
- 🐳 **Docker Deployment** - Clean, isolated setup
- 🗣️ **Natural Voice** - ElevenLabs human-like speech
- 🎙️ **Voice Wake** - Hands-free activation
- ⚡ **Lightning Fast** - Production-ready in minutes
</Check>

## Choose Your Path

<CardGroup cols={3}>
  <Card title="macOS User" icon="apple" href="#path-1-macos-native-app">
    Best for Mac users who want the full native experience with menu bar and voice wake
  </Card>
  <Card title="Server Deployment" icon="docker" href="#path-2-docker-deployment">
    Best for running on a server, VPS, or if you want containerized deployment
  </Card>
  <Card title="Both" icon="rocket" href="#path-3-ultimate-setup">
    Get everything: macOS app + Docker backend + all features
  </Card>
</CardGroup>

---

## Path 1: macOS Native App

**Time: 5-7 minutes** | **Platform: macOS only**

### Step 1: Install the App

<Tabs>
  <Tab title="From Release (Recommended)">
    1. Download [latest .dmg](https://github.com/openclaw/openclaw/releases/latest)
    2. Open the .dmg and drag to Applications
    3. Launch OpenClaw.app
  </Tab>
  <Tab title="Build from Source">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    scripts/restart-mac.sh
    ```
  </Tab>
</Tabs>

The lobster icon 🦞 will appear in your menu bar!

### Step 2: Quick Setup

Click the menu bar icon and follow the onboarding:

1. **Connect to Claude/OpenAI** - Your AI model provider
2. **Grant Permissions** - Microphone for voice features
3. Click **Start Gateway**

### Step 3: Enable Natural Voice

1. Sign up for [ElevenLabs](https://elevenlabs.io/) (free tier available)
2. Copy your API key from [Profile → API Keys](https://elevenlabs.io/api)
3. In OpenClaw menu bar → **Settings** → **General**, add:

```json5
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "YOUR_ELEVENLABS_KEY",
        "voiceId": "pMsXgVXv3BLzUgSXRplE"  // Rachel - warm & natural
      }
    }
  }
}
```

### Step 4: Enable Voice Wake

1. Menu bar → **Settings** → **Voice Wake**
2. Turn on "Voice Wake"
3. Say **"Hey Claw"** and give it a command!

<Check>
✅ You're done! Try: "Hey Claw, what's the weather today?"
</Check>

**What you have now:**
- ✅ macOS menu bar app
- ✅ Human-like voice responses
- ✅ Voice wake words ("Hey Claw")
- ✅ Native macOS integration

**Next:** [macOS App Guide](/start/macos-app-quickstart) | [Voice Settings](/start/voice-quickstart)

---

## Path 2: Docker Deployment

**Time: 3-5 minutes** | **Platform: Any (Linux/Mac/Windows)**

Perfect for servers, VPS, or clean containerized setup.

### Step 1: Install Docker

<Tabs>
  <Tab title="macOS/Windows">
    Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  </Tab>
  <Tab title="Linux">
    ```bash
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    newgrp docker
    ```
  </Tab>
</Tabs>

### Step 2: One-Command Setup

```bash
# Clone and setup
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Automated setup (builds image, configures, starts gateway)
./docker-setup.sh
```

When prompted:
- Gateway bind: **lan**
- Gateway auth: **token**
- Install daemon: **No** (Docker handles it)

### Step 3: Access the Gateway

```bash
# Your gateway is running! Get the URL:
echo "http://127.0.0.1:18789/"

# Get your access token:
cat .env | grep OPENCLAW_GATEWAY_TOKEN
```

Open the URL in your browser and paste the token.

### Step 4: Add Natural Voice

Edit `~/.openclaw/settings/config.json`:

```json5
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "YOUR_ELEVENLABS_KEY",
        "voiceId": "pMsXgVXv3BLzUgSXRplE"
      }
    }
  }
}
```

Restart the gateway:
```bash
docker compose restart openclaw-gateway
```

<Check>
✅ You're done! Send a message and it will respond with voice!
</Check>

**What you have now:**
- ✅ Containerized gateway
- ✅ Web UI access
- ✅ Human-like voice responses
- ✅ Easy updates and scaling

**Next:** [Docker Guide](/start/docker-quickstart) | [Add Channels](/channels)

---

## Path 3: Ultimate Setup

**Time: 10 minutes** | **Platform: macOS + Server**

The complete experience: macOS native app for daily use + Docker backend for reliability.

This is the **recommended production setup** for serious users.

### Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  macOS App      │────────▶│  Docker Gateway  │
│  (Menu Bar)     │  RPC    │  (Server/VPS)    │
│  - Voice Wake   │         │  - Always On     │
│  - Push-to-Talk │         │  - WhatsApp/Tele │
│  - Canvas       │         │  - Voice Calls   │
└─────────────────┘         └──────────────────┘
     Your Mac                 Reliable Backend
```

### Step 1: Setup Docker Backend (5 min)

On your server/VPS (or another Mac):

```bash
# SSH to server (or open terminal if same machine)
ssh user@your-server

# Clone and setup
git clone https://github.com/openclaw/openclaw.git
cd openclaw
./docker-setup.sh
```

Note the gateway URL and token from `.env`.

### Step 2: Setup macOS App (3 min)

On your Mac:

1. Download and install OpenClaw.app
2. Launch the app (menu bar icon appears)
3. Click **Settings** → **Gateway** → **Remote Gateway**
4. Enter your server URL: `http://your-server:18789`
5. Enter the token from Step 1

### Step 3: Configure Voice (2 min)

On your server, edit `~/.openclaw/settings/config.json`:

```json5
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "YOUR_ELEVENLABS_KEY",
        "voiceId": "pMsXgVXv3BLzUgSXRplE"
      }
    }
  }
}
```

Restart Docker gateway:
```bash
docker compose restart openclaw-gateway
```

On your Mac:
1. OpenClaw menu bar → **Settings** → **Voice Wake**
2. Enable "Voice Wake"
3. Say "Hey Claw" + your command!

<Check>
✅ Complete! You now have:
- macOS menu bar app with voice wake
- Docker backend running 24/7
- Natural voice responses
- Connected to all channels
</Check>

**Benefits of this setup:**
- ✅ Best of both worlds
- ✅ Reliable 24/7 backend
- ✅ Native macOS experience
- ✅ Voice wake on your Mac
- ✅ All channels work (WhatsApp, Telegram, etc.)
- ✅ Backend can scale independently

---

## Feature Comparison

| Feature | macOS App | Docker | Ultimate |
|---------|-----------|--------|----------|
| Menu Bar Access | ✅ | ❌ | ✅ |
| Voice Wake Words | ✅ | ❌ | ✅ |
| Push-to-Talk | ✅ | ❌ | ✅ |
| Natural Voice (TTS) | ✅ | ✅ | ✅ |
| 24/7 Operation | ⚠️ | ✅ | ✅ |
| WhatsApp/Telegram | ⚠️ | ✅ | ✅ |
| Voice Calls | ✅ | ✅ | ✅ |
| Canvas Mode | ✅ | ❌ | ✅ |
| Easy Updates | ⚠️ | ✅ | ✅ |

---

## Quick Voice Setup Cheatsheet

### ElevenLabs (Most Natural)

```json5
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "YOUR_KEY",
        "voiceId": "pMsXgVXv3BLzUgSXRplE"  // Rachel
      }
    }
  }
}
```

**Popular Voices:**
- `pMsXgVXv3BLzUgSXRplE` - Rachel (warm, American)
- `ErXwobaYiN019PkySvjV` - Antoni (male, clear)
- `EXAVITQu4vr4xnSDxMaL` - Bella (young, energetic)

### OpenAI (Good & Simple)

```json5
{
  "messages": {
    "tts": {
      "provider": "openai",
      "auto": "always",
      "openai": {
        "voice": "nova"  // alloy, echo, fable, onyx, nova, shimmer
      }
    }
  }
}
```

### Edge TTS (Free)

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

---

## Common First Commands

Once setup, try these voice commands:

<CodeGroup>
```bash Voice Wake (macOS App)
# Just say:
"Hey Claw, what's the weather?"
"Hey Claw, summarize my last 5 emails"
"Hey Claw, create a todo list for today"
```

```bash CLI Commands
# From terminal:
openclaw agent --message "What's on my calendar?" --thinking low
openclaw agent --message "Write a haiku about lobsters" --thinking low
```

```bash Web UI
# Open: http://127.0.0.1:18789/
# Type your message in the chat interface
```
</CodeGroup>

---

## Troubleshooting

### Voice Not Working

<AccordionGroup>
  <Accordion title="No audio output">
    1. Check TTS config: `openclaw config get messages.tts`
    2. Verify API key is set
    3. Test with: `openclaw agent --message "test" --thinking low`
    4. Check system volume/speakers
  </Accordion>
  
  <Accordion title="Voice wake not triggering">
    1. Grant microphone permissions (System Settings → Privacy)
    2. Check config: `openclaw config get voiceWake`
    3. Try increasing sensitivity
    4. Reduce background noise
  </Accordion>
</AccordionGroup>

### Connection Issues

<AccordionGroup>
  <Accordion title="macOS app can't connect to Docker gateway">
    1. Check Docker is running: `docker compose ps`
    2. Verify gateway URL and token
    3. Check firewall (allow port 18789)
    4. Test URL in browser: `http://your-server:18789`
  </Accordion>
  
  <Accordion title="Gateway won't start">
    1. Check logs: `docker compose logs openclaw-gateway`
    2. Verify ports are free: `ss -tuln | grep 18789`
    3. Restart: `docker compose restart openclaw-gateway`
  </Accordion>
</AccordionGroup>

---

## Next Steps

### Add More Channels

Connect OpenClaw to your favorite messaging platforms:

```bash
# WhatsApp (QR code)
openclaw channels login

# Telegram
openclaw channels add --channel telegram --token BOT_TOKEN

# Discord
openclaw channels add --channel discord --token BOT_TOKEN

# Slack
openclaw channels add --channel slack --token xoxb-YOUR-TOKEN
```

See [Channels Guide](/channels) for all options.

### Enable Voice Calls

Make and receive phone calls:

```bash
openclaw plugins install @openclaw/voice-call
```

See [Voice Call Plugin](/plugins/voice-call) for setup.

### Customize Your Assistant

```bash
# Set custom system prompt
openclaw config set agents.system "You are a helpful lobster assistant..."

# Configure response style
openclaw config set agents.thinking "high"  # high, low, none

# Set preferred model
openclaw config set agents.defaultModel "claude-opus-4"
```

---

## Advanced: Production Deployment

For serious deployments:

### Security Hardening

```bash
# Use strong gateway token
openssl rand -hex 32 > .gateway-token

# Restrict to localhost + reverse proxy
export OPENCLAW_GATEWAY_BIND=loopback

# Setup nginx/Caddy for HTTPS
# See: /install/hetzner
```

### High Availability

```yaml
# docker-compose.yml
services:
  openclaw-gateway:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### Monitoring

```bash
# Health check endpoint
curl http://localhost:18789/health

# View metrics
openclaw gateway status --deep

# Tail logs
docker compose logs -f openclaw-gateway
```

---

## Resources & Guides

<CardGroup cols={2}>
  <Card title="macOS App Guide" icon="apple" href="/start/macos-app-quickstart">
    Complete macOS app documentation
  </Card>
  <Card title="Docker Guide" icon="docker" href="/start/docker-quickstart">
    Deep dive into Docker deployment
  </Card>
  <Card title="Voice Features" icon="microphone" href="/start/voice-quickstart">
    Everything about voice & TTS
  </Card>
  <Card title="Channels" icon="comments" href="/channels">
    Connect messaging platforms
  </Card>
  <Card title="Voice Calls" icon="phone" href="/plugins/voice-call">
    Phone integration setup
  </Card>
  <Card title="Configuration" icon="gear" href="/configuration">
    All configuration options
  </Card>
</CardGroup>

---

## Support

Need help?

- 💬 [Discord Community](https://discord.gg/clawd)
- 📚 [Full Documentation](https://docs.openclaw.ai)
- 🐛 [GitHub Issues](https://github.com/openclaw/openclaw/issues)
- 📧 Email: support@openclaw.ai

---

<Check>
**You're all set!** Enjoy your personal AI assistant with natural voice, menu bar access, and reliable Docker backend. 🦞
</Check>
