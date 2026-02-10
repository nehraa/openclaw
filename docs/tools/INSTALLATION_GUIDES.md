# AI Tools Installation & Configuration Guides

Complete installation and configuration guides for all 42 AI tools integrated into OpenClaw.

**Last Updated:** 2026-02-10

---

## Table of Contents

- [Quick Start](#quick-start)
- [Agent Orchestration](#agent-orchestration)
  - [CAMEL](#camel)
  - [Semantic Kernel](#semantic-kernel)
  - [Langflow](#langflow)
  - [AutoGPT](#autogpt)
- [Coding Agents](#coding-agents)
  - [Cline](#cline)
  - [Roo Code](#roo-code)
  - [OpenHands](#openhands)
  - [Void Editor](#void-editor)
  - [OpenCode](#opencode)
  - [SuperAGI](#superagi)
  - [CodeGeeX](#codegeex)
  - [GPT Pilot](#gpt-pilot)
  - [Plandex](#plandex)
  - [Goose](#goose)
  - [AgentGPT](#agentgpt)
  - [Mentat](#mentat)
  - [AutoCodeRover](#autocoderover)
- [RAG & Knowledge](#rag--knowledge)
  - [AnythingLLM](#anythingllm)
- [Multimedia](#multimedia)
  - [Transformers.js](#transformersjs)

---

## Quick Start

All tools in OpenClaw are designed to work with minimal configuration. Each tool:

1. **Simulates execution** by default (no external dependencies required)
2. **Connects to real services** when properly configured
3. **Falls back gracefully** when services are unavailable

### Basic Configuration Pattern

Add to `~/.openclaw/config.json`:

```json
{
  "tools": {
    "toolname": {
      "enabled": true
      // Tool-specific config here
    }
  }
}
```

Or set environment variables:

```bash
export TOOLNAME_ENABLED=true
export TOOLNAME_API_KEY=your-key-here
```

---

## Agent Orchestration

### CAMEL

**License:** Apache 2.0  
**Repository:** https://github.com/camel-ai/camel  
**Documentation:** https://www.camel-ai.org/

#### Installation

```bash
# Python installation
pip install camel-ai

# Optional: Install with all features
pip install "camel-ai[all]"
```

#### Configuration

**Config file** (`~/.openclaw/config.json`):

```json
{
  "tools": {
    "camel": {
      "enabled": true,
      "modelName": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 2048
    }
  }
}
```

**Environment variables**:

```bash
export CAMEL_MODEL="gpt-4"
export OPENAI_API_KEY="your-key-here"  # For OpenAI models
```

#### Setup Guide

1. **Install CAMEL**:

   ```bash
   pip install camel-ai
   ```

2. **Set up API keys**:

   ```bash
   export OPENAI_API_KEY="sk-..."
   # Or for other providers
   export ANTHROPIC_API_KEY="..."
   ```

3. **Test the installation**:

   ```bash
   openclaw message send --to agent --message "Create a CAMEL society for research collaboration"
   ```

4. **Use in workflows**:
   - Create agent societies for collaborative tasks
   - Enable agent-to-agent negotiation
   - Generate synthetic data for training

#### Features

- Multi-agent societies with role-based communication
- Agent-to-agent negotiation protocols
- Chain of Thought generation
- Data generation for research
- Minimal infrastructure requirements

---

### Semantic Kernel

**License:** MIT  
**Repository:** https://github.com/microsoft/semantic-kernel  
**Documentation:** https://learn.microsoft.com/semantic-kernel/

#### Installation

```bash
# Python
pip install semantic-kernel

# .NET
dotnet add package Microsoft.SemanticKernel

# Java
# Add to pom.xml:
# <dependency>
#   <groupId>com.microsoft.semantic-kernel</groupId>
#   <artifactId>semantickernel-api</artifactId>
# </dependency>
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "semanticKernel": {
      "enabled": true,
      "modelProvider": "openai",
      "apiKey": "your-key",
      "telemetryEnabled": true
    }
  }
}
```

**Environment variables**:

```bash
export SK_MODEL_PROVIDER="openai"
export SK_API_KEY="your-key"
export OPENAI_API_KEY="sk-..."  # For OpenAI provider
```

#### Setup Guide

1. **Install Semantic Kernel**:

   ```bash
   pip install semantic-kernel
   ```

2. **Configure model provider**:

   ```bash
   export OPENAI_API_KEY="sk-..."
   # Or for Azure OpenAI
   export AZURE_OPENAI_ENDPOINT="https://..."
   export AZURE_OPENAI_API_KEY="..."
   ```

3. **Create a kernel**:

   ```bash
   openclaw message send --to agent --message "Create a Semantic Kernel with GPT-4"
   ```

4. **Add plugins and functions**:
   - Register custom plugins
   - Add semantic functions
   - Enable telemetry and observability

#### Features

- Model-agnostic SDK
- Enterprise-grade observability and telemetry
- Security hooks and filters
- Plugin system
- Future-proof against model changes

---

### Langflow

**License:** MIT  
**Repository:** https://github.com/langflow-ai/langflow  
**Documentation:** https://docs.langflow.org/

#### Installation

```bash
# Install Langflow
pip install langflow

# Or with Docker
docker run -p 7860:7860 langflowai/langflow:latest
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "langflow": {
      "enabled": true,
      "serverUrl": "http://localhost:7860",
      "port": 7860
    }
  }
}
```

**Environment variables**:

```bash
export LANGFLOW_SERVER_URL="http://localhost:7860"
```

#### Setup Guide

1. **Start Langflow server**:

   ```bash
   langflow run
   # Or with Docker
   docker run -p 7860:7860 langflowai/langflow
   ```

2. **Access the UI**:
   - Open http://localhost:7860
   - Create visual workflows using drag-and-drop

3. **Use from OpenClaw**:

   ```bash
   openclaw message send --to agent --message "Create a Langflow RAG pipeline"
   ```

4. **Export/Import flows**:
   - Export flows as JSON
   - Share with team members
   - Version control your workflows

#### Features

- Visual drag-and-drop workflow builder
- Pre-built templates for common patterns
- MCP server integration
- Real-time flow execution
- Component marketplace

---

### AutoGPT

**License:** MIT  
**Repository:** https://github.com/Significant-Gravitas/AutoGPT  
**Documentation:** https://docs.agpt.co/

#### Installation

```bash
# Clone and install
git clone https://github.com/Significant-Gravitas/AutoGPT.git
cd AutoGPT
pip install -r requirements.txt

# Or use Docker
docker pull significantgravitas/auto-gpt
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "autogpt": {
      "enabled": true,
      "cloudEndpoint": "https://platform.autogpt.com",
      "apiKey": "your-key"
    }
  }
}
```

**Environment variables**:

```bash
export AUTOGPT_CLOUD_ENDPOINT="https://platform.autogpt.com"
export AUTOGPT_API_KEY="your-key"
export OPENAI_API_KEY="sk-..."
```

#### Setup Guide

1. **Set up AutoGPT**:

   ```bash
   git clone https://github.com/Significant-Gravitas/AutoGPT.git
   cd AutoGPT
   cp .env.template .env
   # Edit .env with your API keys
   ```

2. **Configure API keys**:

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Run AutoGPT**:

   ```bash
   python -m autogpt
   ```

4. **Use from OpenClaw**:
   ```bash
   openclaw message send --to agent --message "Create an AutoGPT agent for market research"
   ```

#### Features

- Autonomous task execution
- Block-based workflow building
- Continuous cloud agents
- Web-based visual editor
- Low technical barriers

---

## Coding Agents

### Cline

**License:** Free  
**Repository:** https://github.com/cline/cline  
**Documentation:** https://cline.bot/

#### Installation

```bash
# VS Code Extension
code --install-extension cline.cline

# Or search for "Cline" in VS Code Extensions
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "cline": {
      "enabled": true,
      "requireApproval": true,
      "auditEnabled": true
    }
  }
}
```

**Environment variables**:

```bash
export CLINE_REQUIRE_APPROVAL=true
export CLINE_AUDIT_ENABLED=true
```

#### Setup Guide

1. **Install VS Code extension**:
   - Open VS Code
   - Search for "Cline" in Extensions
   - Click Install

2. **Configure approval workflow**:

   ```json
   {
     "cline.requireApproval": true,
     "cline.auditTrail": true
   }
   ```

3. **Set up MCP integration**:

   ```bash
   openclaw message send --to agent --message "Connect Cline to MCP server"
   ```

4. **Start coding with approval gates**:
   - Cline will plan before executing
   - Review diffs before approval
   - Audit trail automatically maintained

#### Features

- Strict "Plan and Act" workflow
- Human approval required for changes
- Standardized diff previews
- Enterprise audit trail
- Full MCP integration

---

### Roo Code

**License:** MIT  
**Repository:** https://github.com/RooVetGit/Roo-Code  
**Documentation:** https://roo-code.dev/

#### Installation

```bash
# VS Code Extension
code --install-extension roovet.roo-code
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "rooCode": {
      "enabled": true,
      "defaultRole": "Developer",
      "updateSpeed": "fast"
    }
  }
}
```

**Environment variables**:

```bash
export ROOCODE_DEFAULT_ROLE="Developer"
export ROOCODE_UPDATE_SPEED="fast"
```

#### Setup Guide

1. **Install extension**:
   - Search "Roo Code" in VS Code Extensions
   - Install and reload

2. **Set default role**:

   ```json
   {
     "rooCode.defaultRole": "Developer",
     "rooCode.roles": ["Architect", "Developer", "Tester"]
   }
   ```

3. **Use role-based execution**:
   ```bash
   openclaw message send --to agent --message "Create a Roo Code task with Architect role"
   ```

#### Features

- Role-driven execution (Architect, Developer, Tester)
- Faster update cycles than Cline
- Community-driven development
- High VS Code compatibility
- Adaptability over governance

---

### OpenHands

**License:** MIT  
**Repository:** https://github.com/All-Hands-AI/OpenHands  
**Documentation:** https://docs.all-hands.dev/

#### Installation

```bash
# Install OpenHands
pip install openhands

# Or use Docker
docker run -p 3000:3000 allhandsai/openhands
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "openhands": {
      "enabled": true,
      "maxAgents": 10,
      "benchmarkMode": false
    }
  }
}
```

**Environment variables**:

```bash
export OPENHANDS_MAX_AGENTS=10
export OPENHANDS_BENCHMARK_MODE=false
export LLM_API_KEY="your-key"
```

#### Setup Guide

1. **Install OpenHands**:

   ```bash
   pip install openhands
   ```

2. **Configure API keys**:

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Run OpenHands**:

   ```bash
   openhands --port 3000
   ```

4. **Use multi-agent delegation**:
   ```bash
   openclaw message send --to agent --message "Create OpenHands delegation for bug fixing"
   ```

#### Features

- 53% resolution rate on SWE-bench
- Multi-agent delegation
- Research-focused architecture
- Complex system engineering
- High accuracy on benchmarks

---

### Void Editor

**License:** MIT  
**Repository:** https://github.com/voideditor/void  
**Documentation:** https://voideditor.dev/

#### Installation

```bash
# Download from website
# https://voideditor.dev/download

# Or build from source
git clone https://github.com/voideditor/void
cd void
npm install
npm run build
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "voidEditor": {
      "enabled": true,
      "apiEndpoint": "http://localhost:8080",
      "offlineMode": true
    }
  }
}
```

**Environment variables**:

```bash
export VOID_EDITOR_API_ENDPOINT="http://localhost:8080"
export VOID_EDITOR_OFFLINE_MODE=true
```

#### Setup Guide

1. **Download Void Editor**:
   - Visit https://voideditor.dev/download
   - Install for your platform

2. **Configure for local models**:

   ```json
   {
     "void.modelProvider": "ollama",
     "void.ollamaUrl": "http://localhost:11434"
   }
   ```

3. **Enable privacy mode**:
   - All data stays local
   - No telemetry sent
   - Full control over AI models

#### Features

- Privacy-focused Cursor alternative
- Clean AI-native interface
- No SaaS lock-in
- Full data control
- Offline-capable

---

### OpenCode

**License:** Open Source  
**Repository:** https://github.com/opencode-ai/opencode  
**Documentation:** https://opencode.ai/docs

#### Installation

```bash
# Install OpenCode models
pip install opencode

# Download models
opencode download --model base
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "opencode": {
      "enabled": true,
      "modelFamily": "opencode-base",
      "benchmarkEnabled": false
    }
  }
}
```

**Environment variables**:

```bash
export OPENCODE_MODEL_FAMILY="opencode-base"
```

#### Setup Guide

1. **Install OpenCode**:

   ```bash
   pip install opencode
   ```

2. **Download models**:

   ```bash
   opencode download --model base
   ```

3. **Run inference**:
   ```bash
   openclaw message send --to agent --message "Generate code using OpenCode"
   ```

#### Features

- Specialized code generation models
- High accuracy on benchmarks
- Open model family
- Development tools integrated
- Code-specific optimizations

---

### SuperAGI

**License:** MIT  
**Repository:** https://github.com/TransformerOptimus/SuperAGI  
**Documentation:** https://superagi.com/docs

#### Installation

```bash
# Clone and setup
git clone https://github.com/TransformerOptimus/SuperAGI.git
cd SuperAGI
docker-compose up -d
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "superagi": {
      "enabled": true,
      "maxAgents": 100,
      "scalingEnabled": true
    }
  }
}
```

**Environment variables**:

```bash
export SUPERAGI_MAX_AGENTS=100
export SUPERAGI_SCALING_ENABLED=true
```

#### Setup Guide

1. **Start SuperAGI**:

   ```bash
   git clone https://github.com/TransformerOptimus/SuperAGI.git
   cd SuperAGI
   docker-compose up -d
   ```

2. **Access UI**:
   - Open http://localhost:3000
   - Create agent templates

3. **Use from OpenClaw**:
   ```bash
   openclaw message send --to agent --message "Create SuperAGI assembly line"
   ```

#### Features

- Enterprise agent infrastructure
- Agent scaling capabilities
- Assembly line for agent workflows
- Production-ready architecture
- Multi-agent orchestration

---

### CodeGeeX

**License:** Open Source  
**Repository:** https://github.com/THUDM/CodeGeeX  
**Documentation:** https://codegeex.cn/

#### Installation

```bash
# Install CodeGeeX
pip install codegeex

# Or use VS Code extension
code --install-extension aminer.codegeex
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "codegeex": {
      "enabled": true,
      "modelSize": "13B",
      "languages": ["python", "javascript", "java", "go"]
    }
  }
}
```

**Environment variables**:

```bash
export CODEGEEX_MODEL_SIZE="13B"
```

#### Setup Guide

1. **Install CodeGeeX**:

   ```bash
   pip install codegeex
   ```

2. **Use in VS Code**:
   - Install CodeGeeX extension
   - Configure for multiple languages

3. **Generate multilingual code**:
   ```bash
   openclaw message send --to agent --message "Translate Python to Java using CodeGeeX"
   ```

#### Features

- Multilingual code generation
- Cross-language translation
- Documentation generation
- 13B+ parameter models
- VS Code plugin

---

### GPT Pilot

**License:** MIT  
**Repository:** https://github.com/Pythagora-io/gpt-pilot  
**Documentation:** https://github.com/Pythagora-io/gpt-pilot/wiki

#### Installation

```bash
# Clone and install
git clone https://github.com/Pythagora-io/gpt-pilot.git
cd gpt-pilot
pip install -r requirements.txt
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "gptPilot": {
      "enabled": true,
      "iterativeMode": true,
      "testingEnabled": true
    }
  }
}
```

**Environment variables**:

```bash
export GPT_PILOT_ITERATIVE_MODE=true
export OPENAI_API_KEY="sk-..."
```

#### Setup Guide

1. **Install GPT Pilot**:

   ```bash
   git clone https://github.com/Pythagora-io/gpt-pilot.git
   cd gpt-pilot
   pip install -r requirements.txt
   ```

2. **Set API key**:

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Start a project**:

   ```bash
   python pilot.py
   ```

4. **Use from OpenClaw**:
   ```bash
   openclaw message send --to agent --message "Create a web app with GPT Pilot"
   ```

#### Features

- Builds entire applications
- Acts as lead developer
- Iterative development process
- Code review integration
- Multi-step reasoning

---

### Plandex

**License:** MIT  
**Repository:** https://github.com/plandex-ai/plandex  
**Documentation:** https://plandex.ai/docs

#### Installation

```bash
# Install Plandex CLI
curl -sL https://plandex.ai/install.sh | bash

# Or with Homebrew
brew install plandex
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "plandex": {
      "enabled": true,
      "terminalMode": true,
      "refactorScope": "large"
    }
  }
}
```

**Environment variables**:

```bash
export PLANDEX_TERMINAL_MODE=true
export OPENAI_API_KEY="sk-..."
```

#### Setup Guide

1. **Install Plandex**:

   ```bash
   curl -sL https://plandex.ai/install.sh | bash
   ```

2. **Initialize in project**:

   ```bash
   cd your-project
   plandex init
   ```

3. **Create a plan**:

   ```bash
   plandex plan "Refactor authentication module"
   ```

4. **Use from OpenClaw**:
   ```bash
   openclaw message send --to agent --message "Create Plandex plan for refactoring"
   ```

#### Features

- Terminal-based complex tasks
- Multi-file editing
- Large-scale refactoring
- GitHub integration
- Plan tracking and execution

---

### Goose

**License:** MIT  
**Repository:** https://github.com/block/goose  
**Documentation:** https://block.github.io/goose/

#### Installation

```bash
# Install Goose
pip install goose-ai

# Or use pre-built binary
curl -fsSL https://goose.ai/install.sh | sh
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "goose": {
      "enabled": true,
      "deterministicMode": true,
      "blockValidation": true
    }
  }
}
```

**Environment variables**:

```bash
export GOOSE_DETERMINISTIC_MODE=true
export GOOSE_BLOCK_VALIDATION=true
```

#### Setup Guide

1. **Install Goose**:

   ```bash
   pip install goose-ai
   ```

2. **Configure for reliability**:

   ```json
   {
     "goose.deterministicMode": true,
     "goose.blockValidation": true
   }
   ```

3. **Create blocks**:
   ```bash
   openclaw message send --to agent --message "Create Goose block for data processing"
   ```

#### Features

- High-reliability agent
- Deterministic outcomes
- Block-based logic
- Production-ready
- Enterprise focus

---

### AgentGPT

**License:** Freemium  
**Repository:** https://github.com/reworkd/AgentGPT  
**Documentation:** https://docs.reworkd.ai/

#### Installation

```bash
# Clone and setup
git clone https://github.com/reworkd/AgentGPT.git
cd AgentGPT
docker-compose up -d

# Or use hosted version at https://agentgpt.reworkd.ai/
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "agentgpt": {
      "enabled": true,
      "webEndpoint": "https://agentgpt.reworkd.ai",
      "apiKey": "your-key"
    }
  }
}
```

**Environment variables**:

```bash
export AGENTGPT_WEB_ENDPOINT="https://agentgpt.reworkd.ai"
export AGENTGPT_API_KEY="your-key"
```

#### Setup Guide

1. **Use hosted version**:
   - Go to https://agentgpt.reworkd.ai
   - Create account

2. **Or self-host**:

   ```bash
   git clone https://github.com/reworkd/AgentGPT.git
   cd AgentGPT
   docker-compose up -d
   ```

3. **Create web agent**:
   ```bash
   openclaw message send --to agent --message "Create AgentGPT for market analysis"
   ```

#### Features

- Browser-based autonomous agents
- Web-native deployment
- No setup required (hosted)
- Visual interface
- Autonomous task execution

---

### Mentat

**License:** MIT  
**Repository:** https://github.com/AbanteAI/mentat  
**Documentation:** https://mentat.ai/

#### Installation

```bash
# Install Mentat
pip install mentat

# Or with pipx
pipx install mentat
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "mentat": {
      "enabled": true,
      "coordinationMode": "automatic",
      "githubIntegration": true
    }
  }
}
```

**Environment variables**:

```bash
export MENTAT_COORDINATION_MODE="automatic"
export OPENAI_API_KEY="sk-..."
```

#### Setup Guide

1. **Install Mentat**:

   ```bash
   pip install mentat
   ```

2. **Initialize in project**:

   ```bash
   cd your-project
   mentat
   ```

3. **Coordinate multi-file edits**:
   ```bash
   openclaw message send --to agent --message "Use Mentat to coordinate refactoring"
   ```

#### Features

- CLI multi-file coordinator
- GitHub issue reviews
- Dependency tracking
- Terminal-based
- Codebase awareness

---

### AutoCodeRover

**License:** MIT  
**Repository:** https://github.com/nus-apr/auto-code-rover  
**Documentation:** https://github.com/nus-apr/auto-code-rover/wiki

#### Installation

```bash
# Clone and install
git clone https://github.com/nus-apr/auto-code-rover.git
cd auto-code-rover
pip install -r requirements.txt
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "autocoderover": {
      "enabled": true,
      "analysisDepth": "deep",
      "autoFix": false
    }
  }
}
```

**Environment variables**:

```bash
export AUTOCODEROVER_ANALYSIS_DEPTH="deep"
export AUTOCODEROVER_AUTO_FIX=false
```

#### Setup Guide

1. **Install AutoCodeRover**:

   ```bash
   git clone https://github.com/nus-apr/auto-code-rover.git
   cd auto-code-rover
   pip install -r requirements.txt
   ```

2. **Configure analysis**:

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Analyze bugs**:
   ```bash
   openclaw message send --to agent --message "Analyze bug with AutoCodeRover"
   ```

#### Features

- Automated bug fixing
- Program analysis
- Research-grade accuracy
- Advanced analysis techniques
- Issue resolution automation

---

## RAG & Knowledge

### AnythingLLM

**License:** MIT  
**Repository:** https://github.com/Mintplex-Labs/anything-llm  
**Documentation:** https://docs.anythingllm.com/

#### Installation

```bash
# Desktop app download
# https://anythingllm.com/download

# Or Docker
docker run -d -p 3001:3001 mintplexlabs/anythingllm

# Or from source
git clone https://github.com/Mintplex-Labs/anything-llm.git
cd anything-llm
yarn install
yarn dev
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "anythingllm": {
      "enabled": true,
      "serverUrl": "http://localhost:3001",
      "offlineMode": true
    }
  }
}
```

**Environment variables**:

```bash
export ANYTHINGLLM_SERVER_URL="http://localhost:3001"
export ANYTHINGLLM_OFFLINE_MODE=true
```

#### Setup Guide

1. **Install AnythingLLM**:
   - Download desktop app from https://anythingllm.com/download
   - Or use Docker: `docker run -d -p 3001:3001 mintplexlabs/anythingllm`

2. **Create workspace**:
   - Open http://localhost:3001
   - Create new workspace
   - Upload documents

3. **Connect to Ollama**:

   ```json
   {
     "llmProvider": "ollama",
     "ollamaUrl": "http://localhost:11434"
   }
   ```

4. **Use from OpenClaw**:
   ```bash
   openclaw message send --to agent --message "Create AnythingLLM workspace for docs"
   ```

#### Features

- Desktop RAG application
- Drag-drop document upload
- Auto-chunking and embedding
- Works offline with Ollama
- Multi-user workspaces
- Chat interface

---

## Multimedia

### Transformers.js

**License:** Apache 2.0  
**Repository:** https://github.com/xenova/transformers.js  
**Documentation:** https://huggingface.co/docs/transformers.js/

#### Installation

```bash
# npm
npm install @xenova/transformers

# yarn
yarn add @xenova/transformers

# pnpm
pnpm add @xenova/transformers
```

#### Configuration

**Config file**:

```json
{
  "tools": {
    "transformersJs": {
      "enabled": true,
      "runtime": "browser",
      "modelCache": "./.cache/transformers"
    }
  }
}
```

**Environment variables**:

```bash
export TRANSFORMERS_CACHE="./.cache/transformers"
```

#### Setup Guide

1. **Install package**:

   ```bash
   npm install @xenova/transformers
   ```

2. **Use in Node.js**:

   ```javascript
   import { pipeline } from "@xenova/transformers";

   const classifier = await pipeline("sentiment-analysis");
   const result = await classifier("I love this!");
   ```

3. **Use in browser**:

   ```html
   <script type="module">
     import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";
     const classifier = await pipeline("sentiment-analysis");
   </script>
   ```

4. **Use from OpenClaw**:
   ```bash
   openclaw message send --to agent --message "Run sentiment analysis with Transformers.js"
   ```

#### Features

- ONNX inference in browser/Node.js
- No Python required
- Vision and language models
- Edge deployment ready
- Model caching
- WebGPU acceleration

---

## Advanced Configuration

### Multi-Tool Workflows

Combine multiple tools for complex workflows:

```json
{
  "tools": {
    "langchain": { "enabled": true },
    "chromadb": { "enabled": true },
    "whisper": { "enabled": true },
    "diffusers": { "enabled": true }
  }
}
```

### Environment-Specific Configs

```bash
# Development
export TOOLS_SIMULATE_ONLY=true

# Production
export TOOLS_SIMULATE_ONLY=false
export OPENAI_API_KEY="sk-..."
```

### Tool Policy Groups

Control tool access by group:

```json
{
  "tools": {
    "allow": ["group:ai-orchestration", "group:coding-agents", "group:rag"]
  }
}
```

---

## Troubleshooting

### Common Issues

1. **Tool not found**: Ensure tool is enabled in config
2. **Connection errors**: Check service URLs and ports
3. **API key errors**: Verify environment variables
4. **Simulation mode**: Set `enabled: true` in config

### Debug Mode

Enable debug logging:

```bash
export OPENCLAW_LOG_LEVEL=debug
export TOOL_DEBUG=true
```

### Getting Help

- Documentation: https://docs.openclaw.ai/
- GitHub Issues: https://github.com/openclaw/openclaw/issues
- Community: https://discord.gg/openclaw

---

_Last updated: 2026-02-10_  
_For the latest setup instructions, visit: https://docs.openclaw.ai/tools/_
