---
summary: "Ultra-simple Docker setup - one command to get OpenClaw running in a container"
read_when:
  - You want containerized deployment
  - You want zero-configuration setup
  - You're deploying to a server or VPS
title: "Docker Quick Start"
---

# Docker Quick Start

Get OpenClaw running in Docker with a single command. Perfect for servers, VPS, or if you want a clean containerized setup.

## What You Get

- **Isolated Environment** - No local Node.js installation needed
- **One-Command Setup** - Automated build and configuration
- **Persistent Storage** - Your data survives container restarts
- **Easy Updates** - Pull and rebuild to update
- **Multiple Instances** - Run multiple OpenClaw instances easily

## Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Docker Compose v2
- 2GB free disk space (for images + logs)

### Install Docker

<Tabs>
  <Tab title="macOS">
    Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
  </Tab>
  <Tab title="Windows">
    Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
  </Tab>
  <Tab title="Linux">
    ```bash
    # Ubuntu/Debian
    curl -fsSL https://get.docker.com | sh
    
    # Add your user to docker group
    sudo usermod -aG docker $USER
    newgrp docker
    ```
  </Tab>
</Tabs>

## One-Command Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Run the automated setup script
./docker-setup.sh
```

That's it! The script will:

1. ✅ Build the Docker image
2. ✅ Run the onboarding wizard (interactive)
3. ✅ Generate a secure gateway token
4. ✅ Start the gateway service
5. ✅ Show you the access URL and token

### What to Expect

During the setup, you'll be prompted for:

- **Gateway bind**: Choose `lan` (for network access)
- **Gateway auth**: Choose `token`
- **Tailscale exposure**: Choose `Off` (unless you need it)
- **Install daemon**: Choose `No` (Docker manages the service)

The script will generate and save a secure token in `.env`.

## Access Your Gateway

After setup completes:

1. **Open the Control UI**:
   ```
   http://127.0.0.1:18789/
   ```

2. **Get your access token**:
   ```bash
   # The token is in .env
   cat .env | grep OPENCLAW_GATEWAY_TOKEN
   ```

3. **Or get a fresh dashboard link**:
   ```bash
   docker compose run --rm openclaw-cli dashboard --no-open
   ```

4. Paste the token in the Control UI (Settings → Token)

## Manual Setup (Alternative)

If you prefer to run each step manually:

```bash
# 1. Build the image
docker build -t openclaw:local -f Dockerfile .

# 2. Run onboarding
docker compose run --rm openclaw-cli onboard --no-install-daemon

# 3. Start the gateway
docker compose up -d openclaw-gateway

# 4. Check logs
docker compose logs -f openclaw-gateway
```

## Common Operations

### View Logs

```bash
docker compose logs -f openclaw-gateway
```

### Stop the Gateway

```bash
docker compose down
```

### Start the Gateway

```bash
docker compose up -d openclaw-gateway
```

### Restart the Gateway

```bash
docker compose restart openclaw-gateway
```

### Send a Test Message

```bash
docker compose run --rm openclaw-cli agent --message "Hello from Docker!" --thinking low
```

### Add a Channel (WhatsApp, Telegram, etc.)

```bash
# WhatsApp (QR code login)
docker compose run --rm openclaw-cli channels login

# Telegram (bot token)
docker compose run --rm openclaw-cli channels add --channel telegram --token YOUR_BOT_TOKEN

# Discord (bot token)
docker compose run --rm openclaw-cli channels add --channel discord --token YOUR_BOT_TOKEN
```

See [Channels Documentation](/channels) for more options.

### Update to Latest Version

```bash
# Pull latest code
git pull

# Rebuild the image
docker build -t openclaw:local -f Dockerfile .

# Restart the gateway
docker compose up -d openclaw-gateway
```

## Configuration

Your configuration is stored on the host at:

- **Config**: `~/.openclaw/`
- **Workspace**: `~/.openclaw/workspace/`
- **Environment**: `.env` (in repo root)

### Configure Voice (ElevenLabs)

Add to `~/.openclaw/settings/config.json`:

```json5
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "auto": "always",
      "elevenlabs": {
        "apiKey": "your-elevenlabs-api-key",
        "voiceId": "pMsXgVXv3BLzUgSXRplE"
      }
    }
  }
}
```

Then restart:
```bash
docker compose restart openclaw-gateway
```

### Environment Variables

You can customize the setup with environment variables:

```bash
# Custom ports
export OPENCLAW_GATEWAY_PORT=9000
export OPENCLAW_BRIDGE_PORT=9001

# Custom directories
export OPENCLAW_CONFIG_DIR=/path/to/config
export OPENCLAW_WORKSPACE_DIR=/path/to/workspace

# Install extra packages during build
export OPENCLAW_DOCKER_APT_PACKAGES="git vim curl"

# Run the setup
./docker-setup.sh
```

### Extra Mounts

To mount additional directories:

```bash
export OPENCLAW_EXTRA_MOUNTS="/host/path1:/container/path1,/host/path2:/container/path2"
./docker-setup.sh
```

### Named Volume for Home

To persist the entire `/home/node` directory:

```bash
export OPENCLAW_HOME_VOLUME=openclaw-home
./docker-setup.sh
```

## Docker Compose Reference

### Services

- **openclaw-gateway**: Main gateway service (runs in background)
- **openclaw-cli**: CLI access to gateway (interactive commands)

### Ports

- `18789`: Gateway HTTP/WebSocket
- `18790`: Bridge/RPC port

### Volumes

- Config: `~/.openclaw` → `/home/node/.openclaw`
- Workspace: `~/.openclaw/workspace` → `/home/node/.openclaw/workspace`

## Advanced: Multi-Container Setup

Run multiple OpenClaw instances:

```bash
# Instance 1 (default ports)
OPENCLAW_GATEWAY_PORT=18789 OPENCLAW_BRIDGE_PORT=18790 \
  docker compose -p openclaw1 up -d

# Instance 2 (custom ports)
OPENCLAW_GATEWAY_PORT=18889 OPENCLAW_BRIDGE_PORT=18890 \
  docker compose -p openclaw2 up -d
```

## Deploying to a VPS

### Quick Deploy

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Docker (if not installed)
curl -fsSL https://get.docker.com | sh

# Clone and setup
git clone https://github.com/openclaw/openclaw.git
cd openclaw
./docker-setup.sh

# Access from your local machine
# http://your-vps-ip:18789/
```

### Security Considerations

1. **Use a strong gateway token** (auto-generated by setup script)
2. **Configure firewall**:
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 18789/tcp
   sudo ufw enable
   ```
3. **Use HTTPS** with a reverse proxy (nginx, Caddy)
4. **Restrict bind address**:
   - `lan`: Allow local network (default)
   - `loopback`: Only localhost (use with reverse proxy)

### Example nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name openclaw.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs openclaw-gateway

# Verify ports are available
ss -tuln | grep 18789

# Remove old containers
docker compose down
docker compose up -d
```

### "Unauthorized" or "Disconnected (1008)"

```bash
# Get a fresh dashboard link
docker compose run --rm openclaw-cli dashboard --no-open

# Approve the browser device
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a

# Check disk usage
docker system df
```

### Can't Connect from Other Devices

1. **Check gateway bind**:
   ```bash
   docker compose run --rm openclaw-cli config get gateway.bind
   # Should be "lan" for network access
   ```

2. **Check firewall**:
   ```bash
   # On Linux
   sudo ufw status
   sudo ufw allow 18789/tcp
   ```

3. **Verify container is listening**:
   ```bash
   docker compose exec openclaw-gateway ss -tuln | grep 18789
   ```

## Performance Tuning

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  openclaw-gateway:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          memory: 2G
```

### Persistent Logs

```yaml
services:
  openclaw-gateway:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Next Steps

- [Configure Channels](/channels) - Connect messaging platforms
- [Voice Features](/plugins/voice-call) - Add phone call capabilities
- [Hetzner VPS Guide](/install/hetzner) - Specific VPS setup
- [Sandboxing](/gateway/sandboxing) - Agent sandbox configuration

## Resources

- [Full Docker Documentation](/install/docker)
- [Docker Compose File](https://github.com/openclaw/openclaw/blob/main/docker-compose.yml)
- [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile)
- [Setup Script](https://github.com/openclaw/openclaw/blob/main/docker-setup.sh)
