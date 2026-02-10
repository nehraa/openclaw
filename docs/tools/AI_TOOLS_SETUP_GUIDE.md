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
