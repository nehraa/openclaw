---
summary: "Run PicoClaw helper agents from OpenClaw."
read_when:
  - Configuring PicoClaw helpers
  - Using the picoclaw tool
title: "PicoClaw Helpers"
---

# PicoClaw Helpers

OpenClaw can call PicoClaw helpers through the `picoclaw` tool. This runs the
`picoclaw agent` command with a prompt and returns the response to the main
agent.

## Prerequisites

1. Install PicoClaw from <https://github.com/sipeed/picoclaw>.
2. Configure `~/.picoclaw/config.json` for each helper instance.

## Configuration

Add helpers in `openclaw.json` under `tools.picoclaw`. Each helper can point at
a separate `homeDir`, which becomes the `HOME` for that helper process so it
loads `~/.picoclaw/config.json` from that location.

```json5
{
  tools: {
    picoclaw: {
      binPath: "/usr/local/bin/picoclaw",
      defaultHelper: "nano",
      timeoutSeconds: 120,
      helpers: [
        {
          id: "nano",
          homeDir: "/srv/picoclaw-nano",
          session: "cli:nano",
        },
        {
          id: "edge",
          homeDir: "/srv/picoclaw-edge",
          session: "cli:edge",
          timeoutSeconds: 240,
        },
      ],
    },
  },
}
```

## Tool usage

Provide a prompt to the helper:

```json
{
  "message": "Summarize the latest deployment notes.",
  "helper": "nano"
}
```

Optional parameters:

- `session`: override the PicoClaw session key
- `timeoutSeconds`: override the timeout for this run
