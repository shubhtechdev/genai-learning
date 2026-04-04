# Persistent Research Assistant — Agent Memory + Contextual Retrieval

> Phase 6 of a hands-on GenAI → Agentic AI learning roadmap. Closes two critical gaps from earlier phases: agents that remember across sessions (long-term memory via pgvector) and RAG that retrieves accurately (contextual retrieval — Anthropic's technique that cuts retrieval failures by ~49%).

---

## What it does

A CLI research assistant for tech topics (AI papers, dev docs, GitHub repos) that gets smarter over time. It remembers your preferences, the conclusions you've reached, and the sources you've found useful — across sessions, not just within one conversation.

**Session 1:**

```bash
node index.js shubham
You: What is contextual retrieval and how does it differ from basic chunking?
Assistant: [answers from docs, stores memory: "conclusion: contextual retrieval prepends
            LLM-generated context to chunks before embedding, reducing retrieval failures by 49%"]

You: I prefer to learn by building real projects
Assistant: [stores memory: "preference: user prefers hands-on project-based learning"]
```

**Session 2 — new process, days later:**

```bash
node index.js shubham
You: What chunking approach did we discuss last time?
Assistant: [recalls stored memories, continues from where you left off]

You: memories
# Shows all stored memories with importance scores and access counts
```

---

## Concepts covered

| Concept                             | Where it appears                                                         |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Short-term memory (in-session)      | `memory/shortTerm.js`— sliding window messages array                  |
| Long-term memory (cross-session)    | `memory/longTerm.js`— pgvector store with importance scoring          |
| Memory formation via inline signals | `agent/assistant.js`—`[REMEMBER: type: content]`pattern             |
| Importance-weighted memory recall   | `memory/longTerm.js`—`similarity * importance`ranking               |
| Recent memory fallback              | `memory/longTerm.js`— always loads last 3 memories for meta-questions |
| Contextual retrieval                | `rag/chunker.js`— LLM-generated context prepended before embedding    |
| Contextual vs standard chunking     | `rag/chunker.js`— embeds `context + chunk`, displays `chunk`only  |
| Memory type taxonomy                | `agent/prompts.js`— fact, preference, conclusion, source              |
| User-scoped memory isolation        | `memory/longTerm.js`— all queries filtered by `user_id`             |

---

## Project structure

```
phase6-research-assistant/
├── .env                       # GEMINI_API_KEY + DATABASE_URL
├── client.js                  # GoogleGenAI init
├── utils.js                   # withRetry with jitter
├── db.js                      # Postgres pool
├── memory/
│   ├── shortTerm.js           # In-session conversation history (RAM only)
│   ├── longTerm.js            # pgvector memory store with recall + decay
│   └── manager.js             # Unified memory interface for the agent
├── rag/
│   ├── chunker.js             # Contextual chunking — LLM context per chunk
│   ├── embedder.js            # gemini-embedding-001 at 1536 dims
│   ├── ingest.js              # Ingest pipeline with contextual retrieval
│   └── retriever.js           # Vector similarity search
├── agent/
│   ├── prompts.js             # System prompt injecting both memory types
│   └── assistant.js           # Main agent loop — recall → retrieve → generate → store
├── scripts/
│   └── create-docs.js         # Generate sample tech docs for testing
├── docs/                      # Markdown source files
│   ├── contextual-retrieval.md
│   ├── rag-chunking-strategies.md
│   └── agent-memory-patterns.md
└── index.js                   # CLI entry point with readline interface
```

---

## Setup

### Prerequisites

* Node.js 20+
* PostgreSQL with pgvector (Docker)
* Gemini API key with billing enabled

### Database setup

```bash
docker exec -it <your-postgres-container> psql -U postgres \
  -c "CREATE DATABASE research_assistant;"

docker exec -it <your-postgres-container> psql -U postgres -d research_assistant
```

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  context       TEXT,
  embedding     vector(1536) NOT NULL,
  metadata      JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS memories (
  id            BIGSERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL DEFAULT 'default',
  content       TEXT NOT NULL,
  memory_type   TEXT NOT NULL,
  embedding     vector(1536) NOT NULL,
  importance    FLOAT DEFAULT 0.5,
  access_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS memories_user_idx
  ON memories (user_id, memory_type);
```

### Install and configure

```bash
git clone <this-repo>
cd phase6-research-assistant
npm install
cp .env.example .env
# Add: GEMINI_API_KEY and DATABASE_URL
```

### Create docs and ingest

```bash
# Generate sample tech docs
node scripts/create-docs.js

# Ingest with contextual retrieval (runs LLM context generation per chunk)
node rag/ingest.js
```

Expected output:

```
Ingesting 3 documents with contextual retrieval...

Ingesting: contextual-retrieval.md
  Generating context for 8 chunks...
    Chunk 1/8... done
    Chunk 2/8... done
    ...
  Stored 8 contextual chunks

Done. 24 total chunks in DB.
```

### Run

```bash
# Always use a consistent user ID across sessions
node index.js yourname

# Commands during session:
# "memories" — show all stored memories
# "exit"     — end session (memories are already saved)
```

---

## Architecture — the two memory systems

```
EVERY QUERY flows through both systems:

User question
     │
     ├─→ Recall long-term memories (pgvector similarity + recent fallback)
     │
     ├─→ Retrieve relevant doc chunks (RAG with contextual embeddings)
     │
     ├─→ Build context:
     │     system prompt + long-term memories + doc chunks + conversation history
     │
     ├─→ Generate response (Gemini 2.5 Flash)
     │
     ├─→ Extract [REMEMBER: type: content] signals from response
     │
     ├─→ Store new memories to pgvector
     │
     └─→ Append to short-term history (in-memory messages[])
```

---

## Key design decisions

### Short-term memory — sliding window

The `messages[]` array has a hard cap of 20 messages. When exceeded, the oldest user+model pair is dropped. This prevents the context window from growing unbounded across a long session.

Short-term memory lives only in RAM. It is intentionally ephemeral — the current conversation is transient context, not durable knowledge.

### Long-term memory — importance-weighted recall

Memories are ranked at recall time by `similarity * importance`, not by similarity alone. A moderately relevant but highly important memory (an explicit user preference) surfaces above a highly similar but low-importance memory (a casual fact mention).

Importance scores by type:

* `conclusion` — 0.9 (explicitly reached through reasoning)
* `preference` — 0.8 (shapes all future behaviour)
* `source` — 0.6 (useful reference for future retrieval)
* `fact` — 0.5 (general information)

### Recent memory fallback

Semantic similarity alone fails for meta-questions like "what did we discuss last time?" — the question has low similarity to any specific memory content. The fallback always includes the 3 most recently stored memories, merged with semantic results and deduplicated by ID.

This two-tier approach handles both:

* Specific questions: "what do you know about my embedding preference?" → semantic similarity wins
* Meta questions: "what were we working on?" → recency wins

### Memory formation — inline signals

The model signals what to remember using `[REMEMBER: type: content]` inline in its response. This is extracted by regex, stored, and stripped before display. The user never sees the memory machinery.

This is cleaner than asking the model to return a separate JSON object alongside its response (which requires structured output handling and makes responses awkward), and cleaner than summarising the conversation after the fact (which loses in-the-moment context).

### Contextual retrieval — embed more, store less

The critical insight: you embed `context + chunk` but store only `chunk` for display.

Standard chunk embedding:

```
embedded text = "The model returns a 404 error when the endpoint is unreachable."
```

Contextual chunk embedding:

```
embedded text = "This chunk is from the Gemini streaming error handling section and 
describes the HTTP 404 response when the stream endpoint URL is malformed. 
The model returns a 404 error when the endpoint is unreachable."
```

The retrieval benefits from the context-enriched embedding. The generator receives the clean original text. The context is stored separately in the `context` column for debugging.

---

## Real-world issues hit and fixed

| Issue                                                      | Root cause                                          | Fix                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| "No memories from past sessions" on new session            | Model not emitting `[REMEMBER:]`signals           | Made instruction CRITICAL + MUST in system prompt                            |
| Meta-questions ("what did we discuss?") return no memories | Semantic similarity too low for meta-questions      | Added recent memory fallback — always loads last 3 memories                 |
| Recall threshold too high (0.70)                           | Personal memories are less specific than doc chunks | Lowered to 0.55 — memories are conversational, not technical                |
| userId mismatch between sessions                           | Ran `node index.js`vs `node index.js username`  | Always pass consistent userId — documented prominently                      |
| DBeaver can't display `vector`type rows                  | DBeaver doesn't render unknown column types         | Query without embedding column:`SELECT id, source, content FROM documents` |

---

## Lessons learned

**Memory and retrieval are the same mechanism.** Long-term agent memory is RAG applied to the agent's own history instead of external documents. Same embeddings, same pgvector, same cosine similarity — different content. Once you see this connection, building memory systems becomes straightforward.

**The model needs explicit behavioural instructions.** "You may want to remember things" produces inconsistent memory formation. "You MUST include at least one [REMEMBER:] signal in every response when a preference, conclusion, or useful fact appears" produces reliable behaviour. Vague encouragement fails; mandatory instruction works.

**Two recall mechanisms beat one.** Semantic similarity is excellent for content questions but poor for meta-questions about the conversation itself. Recency is excellent for "what did we just work on?" but useless for "what do you know about my Node.js preference?". Both together handle the full range of recall scenarios.

**Contextual retrieval is the highest-ROI RAG improvement.** It requires one LLM call per chunk at ingest time (cheap with flash-lite), zero changes to query time, and zero changes to the retrieval infrastructure. The context column in the documents table is the only schema change. The payoff is approximately 49% fewer retrieval failures on technical documentation.

---

## Tech stack

* **Runtime:** Node.js 20+ (ES modules)
* **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai)
* **Generation model:** `gemini-2.5-flash`
* **Context generation:** `gemini-2.5-flash-lite` (cheap — runs at ingest time only)
* **Embedding model:** `gemini-embedding-001` (1536 dims)
* **Memory + vector store:** PostgreSQL + pgvector
* **CLI:** Node.js `readline` — no extra deps

---

## References

* [Anthropic: Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
* [pgvector](https://github.com/pgvector/pgvector)
* [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
* [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
