# AI Tools Setup Guide

Complete setup instructions for all AI tools integrated into OpenClaw.

## Table of Contents

- [Agent Orchestration](#agent-orchestration)
- [Local LLM Inference](#local-llm-inference)
- [Coding Agents](#coding-agents)
- [RAG & Knowledge](#rag--knowledge)
- [Evaluation & Testing](#evaluation--testing)
- [Multimedia](#multimedia)

---

## Agent Orchestration

### LangChain/LangGraph

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/langchain-ai/langchainjs

#### Installation

```bash
npm install langchain @langchain/core @langchain/community
```

#### Configuration

Add to your `config.json`:

```json
{
  "tools": {
    "langchain": {
      "enabled": true,
      "apiKey": "your-openai-api-key",
      "baseUrl": "https://api.openai.com/v1",
      "modelName": "gpt-4",
      "temperature": 0.7
    }
  }
}
```

Environment variables:
```bash
export LANGCHAIN_API_KEY="your-api-key"
export LANGCHAIN_BASE_URL="https://api.openai.com/v1"
export LANGCHAIN_MODEL="gpt-4"
```

#### Usage

```bash
openclaw message send --to agent --message "Create a LangChain agent to analyze documents"
```

---

### CrewAI

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/joaomdmoura/crewAI

#### Installation

```bash
pip install crewai
npm install @crewai/core  # If Node.js wrapper available
```

#### Configuration

```json
{
  "tools": {
    "crewai": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "maxAgentsPerCrew": 10
    }
  }
}
```

Environment variables:
```bash
export CREWAI_MODEL="gpt-4"
```

---

### AutoGen

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/microsoft/autogen

#### Installation

```bash
pip install pyautogen
npm install @microsoft/autogen  # If available
```

#### Configuration

```json
{
  "tools": {
    "autogen": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "maxAgentsPerChat": 10,
      "enableCodeExecution": false
    }
  }
}
```

Environment variables:
```bash
export AUTOGEN_MODEL="gpt-4"
```

---

### CAMEL

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/camel-ai/camel

#### Installation

```bash
pip install camel-ai
```

#### Configuration

```json
{
  "tools": {
    "camel": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableRoleplay": true,
      "maxAgents": 5
    }
  }
}
```

Environment variables:
```bash
export CAMEL_API_KEY="your-api-key"
export CAMEL_MODEL="gpt-4"
```

#### Usage

```bash
openclaw message send --to agent --message "Create a CAMEL society for code review"
```

---

### Semantic Kernel

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/microsoft/semantic-kernel

#### Installation

```bash
npm install @microsoft/semantic-kernel
```

Or Python:
```bash
pip install semantic-kernel
```

#### Configuration

```json
{
  "tools": {
    "semantickernel": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enablePlugins": true,
      "enablePlanning": true
    }
  }
}
```

Environment variables:
```bash
export SEMANTIC_KERNEL_API_KEY="your-api-key"
export SEMANTIC_KERNEL_MODEL="gpt-4"
```

#### Usage

```bash
openclaw message send --to agent --message "Use Semantic Kernel to plan a task"
```

---

### Langflow

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/langflow-ai/langflow

#### Installation

```bash
pip install langflow
```

#### Start Langflow Server

```bash
langflow run --host localhost --port 7860
```

**Docker:**
```bash
docker run -d -p 7860:7860 langflowai/langflow
```

#### Configuration

```json
{
  "tools": {
    "langflow": {
      "enabled": true,
      "baseUrl": "http://localhost:7860",
      "apiKey": "",
      "enableUIAccess": true
    }
  }
}
```

Environment variables:
```bash
export LANGFLOW_BASE_URL="http://localhost:7860"
export LANGFLOW_API_KEY="your-key"
```

#### Usage

```bash
openclaw message send --to agent --message "Create a Langflow workflow for data processing"
```

---

### AutoGPT

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/Significant-Gravitas/AutoGPT

#### Installation

```bash
pip install autogpt
```

Or clone and install:
```bash
git clone https://github.com/Significant-Gravitas/AutoGPT.git
cd AutoGPT
pip install -r requirements.txt
```

#### Configuration

```json
{
  "tools": {
    "autogpt": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableMemory": true,
      "workspacePath": "./autogpt-workspace"
    }
  }
}
```

Environment variables:
```bash
export OPENAI_API_KEY="your-api-key"
export AUTOGPT_WORKSPACE="./autogpt-workspace"
```

#### Usage

```bash
openclaw message send --to agent --message "Use AutoGPT to research and summarize topic"
```

---

### SuperAGI

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/TransformerOptimus/SuperAGI

#### Installation

```bash
git clone https://github.com/TransformerOptimus/SuperAGI.git
cd SuperAGI
pip install -r requirements.txt
```

**Docker:**
```bash
docker-compose up -d
```

#### Configuration

```json
{
  "tools": {
    "superagi": {
      "enabled": true,
      "baseUrl": "http://localhost:8001",
      "defaultModel": "gpt-4",
      "enableTools": true
    }
  }
}
```

Environment variables:
```bash
export SUPERAGI_API_KEY="your-api-key"
export SUPERAGI_BASE_URL="http://localhost:8001"
```

#### Usage

```bash
openclaw message send --to agent --message "Deploy a SuperAGI agent for task automation"
```

---

### AgentGPT

**Status:** ✅ Implemented  
**License:** Freemium  
**Repository:** https://github.com/reworkd/AgentGPT

#### Installation

```bash
git clone https://github.com/reworkd/AgentGPT.git
cd AgentGPT
npm install
```

**Docker:**
```bash
docker-compose up -d
```

#### Configuration

```json
{
  "tools": {
    "agentgpt": {
      "enabled": true,
      "baseUrl": "http://localhost:3000",
      "apiKey": "",
      "enableWebUI": true
    }
  }
}
```

Environment variables:
```bash
export AGENTGPT_API_KEY="your-api-key"
export NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
```

#### Usage

```bash
openclaw message send --to agent --message "Create an AgentGPT autonomous agent"
```

---

## Local LLM Inference

### Ollama Tools

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/ollama/ollama

#### Installation

**macOS:**
```bash
brew install ollama
ollama serve &
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
```

**Docker:**
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama
```

#### Configuration

```json
{
  "tools": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "defaultModel": "llama3"
    }
  }
}
```

Environment variables:
```bash
export OLLAMA_BASE_URL="http://localhost:11434"
```

#### Pull Models

```bash
ollama pull llama3
ollama pull mistral
ollama pull codellama
```

---

### vLLM

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/vllm-project/vllm

#### Installation

```bash
pip install vllm
```

#### Start vLLM Server

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8b \
  --port 8000
```

**Docker:**
```bash
docker run -d -p 8000:8000 \
  --gpus all \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3-8b
```

#### Configuration

```json
{
  "tools": {
    "vllm": {
      "enabled": true,
      "baseUrl": "http://localhost:8000",
      "defaultModel": "llama-3-8b",
      "enableTensorParallelism": false
    }
  }
}
```

Environment variables:
```bash
export VLLM_BASE_URL="http://localhost:8000"
```

---

### LiteLLM

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/BerriAI/litellm

#### Installation

```bash
pip install litellm[proxy]
```

#### Start LiteLLM Proxy

Create `config.yaml`:
```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: openai/gpt-4
      api_key: os.environ/OPENAI_API_KEY
  - model_name: claude-3
    litellm_params:
      model: anthropic/claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY
  - model_name: ollama-llama3
    litellm_params:
      model: ollama/llama3
      api_base: http://localhost:11434
```

Start proxy:
```bash
litellm --config config.yaml --port 4000
```

#### Configuration

```json
{
  "tools": {
    "litellm": {
      "enabled": true,
      "baseUrl": "http://localhost:4000",
      "apiKey": "your-litellm-key",
      "defaultModel": "gpt-4",
      "enableCostTracking": true
    }
  }
}
```

---

### Transformers.js

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/xenova/transformers.js

#### Installation

```bash
npm install @xenova/transformers
```

#### Configuration

```json
{
  "tools": {
    "transformersjs": {
      "enabled": true,
      "defaultModel": "Xenova/bert-base-uncased",
      "enableCache": true,
      "cachePath": "./transformers-cache"
    }
  }
}
```

Environment variables:
```bash
export TRANSFORMERS_CACHE="./transformers-cache"
```

#### Usage

```javascript
import { pipeline } from '@xenova/transformers';

const classifier = await pipeline('sentiment-analysis');
const result = await classifier('I love OpenClaw!');
console.log(result);
```

---

## Coding Agents

### Continue.dev

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/continuedev/continue

#### Installation

**VS Code Extension:**
1. Install from VS Code marketplace
2. Or: `code --install-extension Continue.continue`

**Configuration:**

Create `~/.continue/config.json`:
```json
{
  "models": [
    {
      "title": "Ollama Llama3",
      "provider": "ollama",
      "model": "llama3",
      "apiBase": "http://localhost:11434"
    }
  ],
  "enableOffline": true
}
```

#### OpenClaw Configuration

```json
{
  "tools": {
    "continue": {
      "enabled": true,
      "defaultModel": "ollama/codellama",
      "enableOffline": true,
      "indexPath": ".continue/index"
    }
  }
}
```

---

### Cline

**Status:** ✅ Implemented  
**License:** Free  
**Repository:** https://github.com/cline/cline

#### Installation

**VS Code Extension:**
```bash
code --install-extension saoudrizwan.claude-dev
```

Or install from VS Code marketplace.

#### Configuration

Create `~/.cline/config.json`:
```json
{
  "apiProvider": "anthropic",
  "apiKey": "your-anthropic-key",
  "model": "claude-3-opus-20240229",
  "enableAutoMode": false
}
```

#### OpenClaw Configuration

```json
{
  "tools": {
    "cline": {
      "enabled": true,
      "defaultModel": "claude-3-opus-20240229",
      "enableAutoMode": false,
      "workspacePath": ".cline"
    }
  }
}
```

#### Usage

```bash
openclaw message send --message "Use Cline to refactor this code"
```

---

### Roo Code

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/RooVetGit/Roo-Code

#### Installation

**VS Code Extension:**
```bash
code --install-extension RooVet.roo-cline
```

#### Configuration

```json
{
  "tools": {
    "roocode": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableContextSharing": true,
      "maxContextSize": 100000
    }
  }
}
```

Environment variables:
```bash
export ROO_CODE_API_KEY="your-api-key"
```

#### Usage

```bash
openclaw message send --message "Use Roo Code for intelligent code completion"
```

---

### OpenHands

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/All-Hands-AI/OpenHands

#### Installation

```bash
git clone https://github.com/All-Hands-AI/OpenHands.git
cd OpenHands
pip install -e .
```

**Docker:**
```bash
docker run -d -p 3000:3000 ghcr.io/all-hands-ai/openhands
```

#### Configuration

```json
{
  "tools": {
    "openhands": {
      "enabled": true,
      "baseUrl": "http://localhost:3000",
      "defaultModel": "gpt-4",
      "enableSandbox": true
    }
  }
}
```

Environment variables:
```bash
export OPENHANDS_API_KEY="your-api-key"
export OPENHANDS_SANDBOX="docker"
```

#### Usage

```bash
openclaw message send --message "Use OpenHands to solve coding task"
```

---

### Void Editor

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/voideditor/void

#### Installation

Download from releases or build from source:
```bash
git clone https://github.com/voideditor/void.git
cd void
npm install
npm run build
```

#### Configuration

```json
{
  "tools": {
    "void": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableInlineCompletion": true,
      "enableChat": true
    }
  }
}
```

Environment variables:
```bash
export VOID_API_KEY="your-api-key"
```

#### Usage

```bash
openclaw message send --message "Open Void Editor for AI-assisted coding"
```

---

### OpenCode

**Status:** ✅ Implemented  
**License:** Open Source  
**Repository:** https://github.com/opencode/opencode

#### Installation

```bash
npm install -g opencode
```

Or:
```bash
pip install opencode
```

#### Configuration

```json
{
  "tools": {
    "opencode": {
      "enabled": true,
      "defaultModel": "codellama",
      "enableMultifile": true,
      "outputPath": "./opencode-output"
    }
  }
}
```

Environment variables:
```bash
export OPENCODE_MODEL="codellama"
```

#### Usage

```bash
opencode --file app.js --prompt "Add error handling"
```

---

### CodeGeeX

**Status:** ✅ Implemented  
**License:** Open Source  
**Repository:** https://github.com/THUDM/CodeGeeX

#### Installation

**VS Code Extension:**
```bash
code --install-extension aminer.codegeex
```

Or Python package:
```bash
pip install codegeex
```

#### Configuration

```json
{
  "tools": {
    "codegeex": {
      "enabled": true,
      "model": "codegeex-13b",
      "enableCompletion": true,
      "enableExplanation": true
    }
  }
}
```

Environment variables:
```bash
export CODEGEEX_MODEL="codegeex-13b"
```

#### Usage

```bash
openclaw message send --message "Use CodeGeeX for code generation"
```

---

### GPT Pilot

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/Pythagora-io/gpt-pilot

#### Installation

```bash
git clone https://github.com/Pythagora-io/gpt-pilot.git
cd gpt-pilot
pip install -r requirements.txt
```

#### Configuration

```json
{
  "tools": {
    "gptpilot": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "projectsPath": "./gpt-pilot-projects",
      "enableIterative": true
    }
  }
}
```

Environment variables:
```bash
export OPENAI_API_KEY="your-api-key"
export GPT_PILOT_WORKSPACE="./gpt-pilot-projects"
```

#### Usage

```bash
python pilot/main.py
```

---

### Plandex

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/plandex-ai/plandex

#### Installation

```bash
curl -sL https://plandex.ai/install.sh | bash
```

Or via Homebrew:
```bash
brew install plandex
```

#### Configuration

```json
{
  "tools": {
    "plandex": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableVersioning": true,
      "projectsPath": "~/.plandex"
    }
  }
}
```

Environment variables:
```bash
export PLANDEX_API_KEY="your-api-key"
export PLANDEX_CLOUD_URL="https://api.plandex.ai"
```

#### Usage

```bash
plandex new myproject
plandex tell "Create a REST API"
plandex apply
```

---

### Goose

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/square/goose

#### Installation

```bash
pip install goose-ai
```

Or with pipx:
```bash
pipx install goose-ai
```

#### Configuration

```json
{
  "tools": {
    "goose": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableToolkit": true,
      "enableMemory": true
    }
  }
}
```

Environment variables:
```bash
export OPENAI_API_KEY="your-api-key"
export GOOSE_PROVIDER="openai"
```

#### Usage

```bash
goose run "Analyze this codebase"
```

---

### Mentat

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/AbanteAI/mentat

#### Installation

```bash
pip install mentat
```

Or with pipx:
```bash
pipx install mentat
```

#### Configuration

```json
{
  "tools": {
    "mentat": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableCodeEditing": true,
      "contextWindow": 8000
    }
  }
}
```

Environment variables:
```bash
export OPENAI_API_KEY="your-api-key"
export MENTAT_MODEL="gpt-4"
```

#### Usage

```bash
mentat "Add unit tests to all functions"
```

---

### AutoCodeRover

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/nus-apr/AutoCodeRover

#### Installation

```bash
git clone https://github.com/nus-apr/AutoCodeRover.git
cd AutoCodeRover
pip install -r requirements.txt
```

#### Configuration

```json
{
  "tools": {
    "autocoderover": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "enableBugFix": true,
      "enableTestGeneration": true
    }
  }
}
```

Environment variables:
```bash
export OPENAI_API_KEY="your-api-key"
export AUTOCODEROVER_WORKSPACE="./acr-workspace"
```

#### Usage

```bash
python run_autocoderover.py --task fix-bug --repo ./myproject
```

---

## RAG & Knowledge

### LlamaIndex

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/run-llama/llama_index

#### Installation

```bash
npm install llamaindex
```

Or Python:
```bash
pip install llama-index
```

#### Configuration

```json
{
  "tools": {
    "llamaindex": {
      "enabled": true,
      "embeddingModel": "text-embedding-ada-002",
      "defaultTopK": 5,
      "storePath": ".llamaindex"
    }
  }
}
```

Environment variables:
```bash
export OPENAI_API_KEY="your-key"
```

---

### ChromaDB

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/chroma-core/chroma

#### Installation

```bash
pip install chromadb
```

#### Start ChromaDB Server

```bash
chroma run --host localhost --port 8000
```

**Docker:**
```bash
docker run -d -p 8000:8000 chromadb/chroma
```

#### Configuration

```json
{
  "tools": {
    "chromadb": {
      "enabled": true,
      "host": "localhost",
      "port": 8000,
      "apiKey": ""
    }
  }
}
```

Environment variables:
```bash
export CHROMADB_HOST="localhost"
export CHROMADB_PORT="8000"
```

---

### Qdrant

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/qdrant/qdrant

#### Installation

**Docker:**
```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

**Native:**
```bash
# Download from https://github.com/qdrant/qdrant/releases
./qdrant
```

#### Configuration

```json
{
  "tools": {
    "qdrant": {
      "enabled": true,
      "host": "localhost",
      "port": 6333,
      "apiKey": "",
      "grpcPort": 6334
    }
  }
}
```

Environment variables:
```bash
export QDRANT_HOST="localhost"
export QDRANT_PORT="6333"
export QDRANT_API_KEY="your-key"
```

---

### AnythingLLM

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/Mintplex-Labs/anything-llm

#### Installation

**Desktop App:**
Download from https://anythingllm.com/download

**Docker:**
```bash
docker run -d -p 3001:3001 \
  -v anythingllm-storage:/app/server/storage \
  mintplexlabs/anythingllm
```

**Source:**
```bash
git clone https://github.com/Mintplex-Labs/anything-llm.git
cd anything-llm
yarn install
yarn dev:server
```

#### Configuration

```json
{
  "tools": {
    "anythingllm": {
      "enabled": true,
      "baseUrl": "http://localhost:3001",
      "apiKey": "",
      "defaultWorkspace": "default",
      "enableDocumentProcessing": true
    }
  }
}
```

Environment variables:
```bash
export ANYTHING_LLM_BASE_URL="http://localhost:3001"
export ANYTHING_LLM_API_KEY="your-api-key"
```

#### Usage

```bash
openclaw message send --message "Use AnythingLLM to create a knowledge workspace"
```

---

## Evaluation & Testing

### Promptfoo

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/promptfoo/promptfoo

#### Installation

```bash
npm install -g promptfoo
```

#### Configuration

```json
{
  "tools": {
    "promptfoo": {
      "enabled": true,
      "defaultModel": "gpt-4",
      "outputPath": "./promptfoo-reports"
    }
  }
}
```

#### Create Test Suite

Create `promptfooconfig.yaml`:
```yaml
prompts:
  - "You are a helpful assistant. {{question}}"

providers:
  - openai:gpt-4
  - ollama:llama3

tests:
  - vars:
      question: "What is the capital of France?"
    assert:
      - type: contains
        value: "Paris"
```

Run evaluation:
```bash
promptfoo eval
promptfoo view
```

---

## Multimedia

### Whisper.cpp

**Status:** ✅ Implemented  
**License:** MIT  
**Repository:** https://github.com/ggerganov/whisper.cpp

#### Installation

**Clone and Build:**
```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
```

**Download Models:**
```bash
bash ./models/download-ggml-model.sh base
bash ./models/download-ggml-model.sh small
```

#### Configuration

```json
{
  "tools": {
    "whisper": {
      "enabled": true,
      "defaultModel": "base",
      "enableGpu": false,
      "modelPath": "./models/whisper"
    }
  }
}
```

#### Usage

```bash
# Via OpenClaw tool
openclaw message send --message "Transcribe audio.mp3 using whisper"

# Direct usage
./main -m models/ggml-base.bin -f audio.wav
```

---

### Diffusers

**Status:** ✅ Implemented  
**License:** Apache 2.0  
**Repository:** https://github.com/huggingface/diffusers

#### Installation

```bash
pip install diffusers transformers accelerate
```

#### Configuration

```json
{
  "tools": {
    "diffusers": {
      "enabled": true,
      "defaultModel": "sd-1.5",
      "defaultScheduler": "euler",
      "enableGpu": false,
      "outputPath": "./outputs"
    }
  }
}
```

#### Usage

```python
from diffusers import StableDiffusionPipeline

pipe = StableDiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5")
pipe = pipe.to("cuda")  # or "cpu"

image = pipe("A beautiful sunset over mountains").images[0]
image.save("output.png")
```

---

## Quick Start Checklist

### Minimal Setup (Local Only)

1. **Install Ollama** (Local LLM)
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama serve &
   ollama pull llama3
   ```

2. **Install ChromaDB** (Vector DB)
   ```bash
   pip install chromadb
   chroma run --host localhost --port 8000 &
   ```

3. **Configure OpenClaw**
   ```json
   {
     "tools": {
       "ollama": { "enabled": true, "baseUrl": "http://localhost:11434" },
       "chromadb": { "enabled": true, "host": "localhost", "port": 8000 }
     }
   }
   ```

### Full Setup (All Tools)

1. Install Docker for containerized services
2. Start all services using docker-compose (see `docker-compose.tools.yml`)
3. Configure API keys in environment variables
4. Enable tools in OpenClaw config
5. Test each tool with sample commands

---

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Check what's using the port
lsof -i :11434
# Kill the process or change the port in config
```

**API Key Not Found:**
```bash
# Set environment variables
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Model Not Found:**
```bash
# Pull the model first
ollama pull llama3
# Or download from Hugging Face
```

**Connection Refused:**
```bash
# Ensure service is running
curl http://localhost:11434/api/tags  # Ollama
curl http://localhost:8000/api/v1/heartbeat  # ChromaDB
```

---

## Docker Compose Setup

Create `docker-compose.tools.yml`:

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-data:/qdrant/storage

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: --config /app/config.yaml

volumes:
  ollama-data:
  chroma-data:
  qdrant-data:
```

Start all services:
```bash
docker-compose -f docker-compose.tools.yml up -d
```

---

## Next Steps

1. Configure your preferred tools in `config.json`
2. Test each tool individually
3. Create workflows combining multiple tools
4. Monitor usage and costs
5. Scale services as needed

For more detailed documentation, visit: https://docs.openclaw.ai/tools
