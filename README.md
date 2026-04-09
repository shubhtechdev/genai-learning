# GenAI → Agentic AI — Hands-On Learning Roadmap

A project-based roadmap for experienced backend developers transitioning into AI engineering. Built with Node.js and the official Google Gen AI SDK — no Python, no tutorials, no theory-first approach.

Each phase produces a real, working project. Concepts compound from phase to phase. By Phase 9 you have a portfolio that demonstrates the full stack of modern AI engineering — from basic LLM calls to MCP servers, persistent agent memory, and production-grade RAG evaluation.

---

## Philosophy

> Build first. Understand by doing. No frameworks until they earn their place.

- Every phase = one real project, 2–5 days to build
- Raw SDK calls before frameworks — you see the mechanics, not the abstraction
- Each project is independently runnable and portfolio-ready
- Mistakes and fixes documented — the learning is in the debugging

---

## The roadmap

| # | Project | Core concept | Status |
|---|---|---|---|
| [01](#01--smart-changelog-generator) | Smart changelog generator | Prompting, structured output, streaming | ✅ Complete |
| [02](#02--code-review-bot) | Code review bot | Prompt chaining, schema-first design | ✅ Complete |
| [03](#03--docs-qa-api-rag) | Docs Q&A API | Embeddings, vector search, grounding | ✅ Complete |
| [04](#04--github-issue-triage-agent) | GitHub issue triage agent | ReAct loop, function calling | ✅ Complete |
| [05](#05--production-ai-hardening) | Production AI hardening | Caching, evals, observability, cost | ✅ Complete |
| [06](#06--persistent-research-assistant) | Persistent research assistant | Agent memory, contextual retrieval | ✅ Complete |
| [07](#07--rag-eval-harness) | RAG eval harness | LLM-as-judge, RAGAS metrics | ✅ Complete |
| [08](#08--fine-tuning-vs-rag-vs-prompting) | Fine-tuning comparison | When to fine-tune, ROI, platform limits | ✅ Complete |
| [09](#09--custom-mcp-server) | Custom MCP server | Model Context Protocol, stdio transport | ✅ Complete |
| [10](#10--agentic-rag-next) | Agentic RAG | Agent-driven retrieval, native JSON mode | 🔜 Next |
| [11](#11--multi-provider--langchain-planned) | Multi-provider + LangChain | Vercel AI SDK, provider tradeoffs | 🔜 Planned |
| [12](#12--local-models--ollama-planned) | Local models — Ollama | Open-source, offline, $0 cost | 🔜 Planned |
| [13](#13--multi-agent-systems-planned) | Multi-agent systems | Orchestrator + subagents, parallel execution | 🔜 Planned |
| [14](#14--browser-agents--long-context-planned) | Browser agents + long-context | Computer use, 1M token context tradeoffs | 🔜 Planned |

---

## Repository structure

```
genai-roadmap/
├── README.md                          ← you are here
│
├── 01-changelog-gen/                  ← Smart changelog generator
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── commits.js
│   ├── prompts.js
│   ├── parser.js
│   ├── renderer.js
│   ├── git.js
│   └── index.js
│
├── 02-code-reviewer/                  ← Code review bot
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── schema.js
│   ├── validator.js
│   ├── prompts.js
│   ├── reviewer.js
│   ├── renderer.js
│   ├── index.js
│   └── samples/
│       ├── good.js
│       └── bad.js
│
├── 03-docs-qa/                        ← Docs Q&A with RAG
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── db.js
│   ├── chunker.js
│   ├── embedder.js
│   ├── pdf-loader.js
│   ├── ingest.js
│   ├── retriever.js
│   ├── generator.js
│   ├── query.js
│   ├── index.js
│   └── docs/
│       ├── gemini-quickstart.md
│       ├── gemini-embeddings.md
│       └── gemini-models.md
│
├── 04-issue-triage/                   ← GitHub triage agent
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── github.js
│   ├── tools.js
│   ├── executor.js
│   ├── agent.js
│   └── index.js
│
├── 05-production/                     ← Production hardening
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── rateLimiter.js
│   ├── logger.js
│   ├── promptRegistry.js
│   ├── fallback.js
│   ├── cache.js
│   ├── tokens.js
│   ├── pipeline.js
│   ├── db.js
│   ├── retriever.js
│   ├── index.js
│   ├── logs/
│   │   └── .gitkeep
│   └── evals/
│       ├── runner.js
│       └── cases.js
│
├── 06-research-assistant/             ← Persistent research assistant
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── db.js
│   ├── memory/
│   │   ├── shortTerm.js
│   │   ├── longTerm.js
│   │   └── manager.js
│   ├── rag/
│   │   ├── chunker.js
│   │   ├── embedder.js
│   │   ├── ingest.js
│   │   └── retriever.js
│   ├── agent/
│   │   ├── prompts.js
│   │   └── assistant.js
│   ├── scripts/
│   │   └── create-docs.js
│   ├── docs/
│   └── index.js
│
├── 07-rag-evals/                      ← RAG eval harness
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── db.js
│   ├── retriever.js
│   ├── generator.js
│   ├── judge.js
│   ├── evalCases.js
│   └── runner.js
│
├── 08-finetuning/                     ← Fine-tuning comparison
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── data/
│   │   ├── generate-training-data.js
│   │   ├── training.jsonl
│   │   └── validation.jsonl
│   ├── tune.js
│   └── compare.js
│
└── 09-mcp-server/                     ← Custom MCP server
    ├── README.md
    ├── .env.example
    ├── client.js
    ├── utils.js
    ├── db.js
    ├── rag/
    │   └── embedder.js
    ├── memory/
    │   └── longTerm.js
    ├── tools/
    │   ├── rag.js
    │   ├── memory.js
    │   └── github.js
    ├── server.js
    └── index.js
```

Each directory is independently runnable. Shared utilities (`client.js`, `utils.js`) are duplicated by design — no cross-phase imports, no monorepo tooling required.

---

## Shared foundations

These two files appear in every phase. Copy them when starting a new one:

**`client.js`** — GoogleGenAI initialisation:
```js
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

**`utils.js`** — retry with exponential backoff + jitter:
```js
export async function withRetry(fn, retries = 3, baseDelayMs = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries - 1;
      if (isLast) throw err;
      const retryable = err?.status === 429 || err?.status === 503;
      if (!retryable) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Attempt ${attempt + 1} failed [${err.status}], retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

---

## 01 — Smart Changelog Generator

📁 [`01-changelog-gen/`](./01-changelog-gen/) · [Full README](./01-changelog-gen/README.md)

Transforms raw `git log` output into a structured, categorised changelog using Gemini. Output is both JSON and Markdown.

**What you learn:** Prompt anatomy, dynamic value injection, defensive output parsing, streaming, retry with backoff.

**The critical lesson:** LLMs are text-in, text-out. Prompt quality directly determines output quality — what examples you show, what rules you number, what you explicitly forbid.

```bash
cd 01-changelog-gen && npm install
node index.js
# Output: CHANGELOG.md
```

---

## 02 — Code Review Bot

📁 [`02-code-reviewer/`](./02-code-reviewer/) · [Full README](./02-code-reviewer/README.md)

Runs a thorough code review on any source file — bugs, security vulnerabilities, performance issues, maintainability — with a concrete fix for each.

**What you learn:** Prompt chaining (2-step pipeline), schema-first design, output schema validation, input validation, few-shot prompting.

**The critical lesson:** Treat LLM output as untrusted external data. Silent schema drift breaks downstream code without throwing an error.

```bash
cd 02-code-reviewer && npm install
node index.js samples/bad.js     # score: ~15/100, 7 issues
node index.js samples/good.js    # score: ~90/100, minimal issues
```

---

## 03 — Docs Q&A API (RAG)

📁 [`03-docs-qa/`](./03-docs-qa/) · [Full README](./03-docs-qa/README.md)

Answers natural language questions grounded strictly in your documents — Gemini embeddings + pgvector + source citations on every answer.

**What you learn:** Embeddings, pgvector + HNSW index, paragraph-aware chunking, ingestion vs query pipeline separation, grounded generation, similarity thresholds.

**The critical lesson:** Chunking is the hardest part of RAG. The same embedding model must be used at ingest time and query time — mixing models produces wrong results silently.

```bash
cd 03-docs-qa && npm install
node ingest.js
node index.js "How do I use streaming?"
node index.js "What is the capital of France?"   # → "I don't have info..."
```

**Requires:** PostgreSQL + pgvector (Docker).

---

## 04 — GitHub Issue Triage Agent

📁 [`04-issue-triage/`](./04-issue-triage/) · [Full README](./04-issue-triage/README.md)

Triages GitHub issues autonomously — reads issues, finds duplicates, applies labels, posts comments, closes duplicates without human input.

**What you learn:** ReAct loop, function calling, tool executor pattern, conversation history as memory, iteration cap guardrail, temperature 0 for determinism.

**The critical lesson:** The model never calls GitHub. It says "I want to call `search_issues`." You call GitHub. You tell the model what came back. This mechanical separation is the foundation of every agent framework ever built.

```bash
cd 04-issue-triage && npm install
node index.js 4     # duplicate detection
node index.js 7     # standard labelling + comment
```

**Requires:** GitHub fine-grained PAT with Issues read/write.

---

## 05 — Production AI Hardening

📁 [`05-production/`](./05-production/) · [Full README](./05-production/README.md)

Hardens the Phase 3 RAG pipeline for production — semantic caching, automated evals, structured logging, fallback chains, cost tracking, prompt versioning.

**What you learn:** Semantic caching (Redis + embeddings), eval framework with CI exit codes, JSONL structured logging, Flash → Pro fallback chain, prompt versioning registry, `ai.models.countTokens()`.

**The critical lesson:** Logging is the first thing to build, not the last. The free tier's 20 RPD cap is a hard wall for pipeline work — enable billing early.

```bash
cd 05-production && npm install
node index.js "How do I use streaming?"
node index.js eval
```

**Requires:** Redis (Docker), PostgreSQL + pgvector, Gemini billing enabled.

---

## 06 — Persistent Research Assistant

📁 [`06-research-assistant/`](./06-research-assistant/) · [Full README](./06-research-assistant/README.md)

A CLI research assistant that remembers your preferences, conclusions, and sources across sessions using short-term (in-memory) and long-term (pgvector) memory, with contextual retrieval for 49% fewer retrieval failures.

**What you learn:** Short-term vs long-term memory architecture, importance-weighted memory recall, recent memory fallback, contextual retrieval (Anthropic's technique).

**The critical lesson:** Long-term agent memory is RAG applied to the agent's own history. Same embeddings, same pgvector, same cosine similarity — different content.

```bash
cd 06-research-assistant && npm install
node scripts/create-docs.js && node rag/ingest.js
node index.js yourname    # Session 1
node index.js yourname    # Session 2 — picks up memories
```

**Requires:** PostgreSQL + pgvector with `memories` table.

---

## 07 — RAG Eval Harness

📁 [`07-rag-evals/`](./07-rag-evals/) · [Full README](./07-rag-evals/README.md)

Automated quality evaluation for the 06 RAG pipeline — four RAGAS-aligned metrics scored by an LLM judge using native JSON mode.

**What you learn:** LLM-as-judge pattern, faithfulness / relevance / precision / recall metrics, native JSON mode, adversarial grounding tests, parallel metric scoring with `Promise.all()`.

**The critical lesson:** Low faithfulness = generator hallucinating. Low precision = retriever returning noise. Low recall = docs don't cover the topic. Each metric points to a different fix.

```bash
cd 07-rag-evals && npm install
node runner.js    # exits 0 if ≥ 0.70, exits 1 if below — CI-ready
```

---

## 08 — Fine-Tuning vs RAG vs Prompting

📁 [`08-finetuning/`](./08-finetuning/) · [Full README](./08-finetuning/README.md)

Head-to-head comparison of zero-shot vs few-shot approaches on changelog generation. Includes training data prep, ROI calculation, and documented platform limitation.

**What you learn:** Fine-tuning decision tree, JSONL training data format, token cost delta between approaches, fine-tuning ROI at scale.

**Platform note:** Gemini Developer API dropped fine-tuning support mid-2025. Zero-shot vs few-shot comparison runs fully; tuning job requires Vertex AI.

```bash
cd 08-finetuning && npm install
node data/generate-training-data.js
node compare.js
```

---

## 09 — Custom MCP Server

📁 [`09-mcp-server/`](./09-mcp-server/) · [Full README](./09-mcp-server/README.md)

Exposes the 06 RAG pipeline, agent memory, and 04 GitHub tools as a standardised MCP server — connectable to Claude Desktop or any MCP client without writing agent code.

**What you learn:** MCP tools vs resources vs prompts, Zod validation, stdio transport, tool descriptions as prompts, MCP Inspector, Claude Desktop integration.

**The critical lesson:** Write the MCP server once. Claude Desktop, Cursor, and your own agents all discover and use the same tools automatically.

```bash
cd 09-mcp-server && npm install
npx @modelcontextprotocol/inspector node index.js
# Then add to Claude Desktop config and restart
```

**Requires:** 06 database, GitHub PAT, Claude Desktop.

---

## 10 — Agentic RAG *(next)*

📁 `10-agentic-rag/` · *Coming soon*

The agent decides when and how to retrieve — not just at query time. Native JSON schema enforcement, query rewriting, multi-hop retrieval, self-correcting retrieval loops, hybrid search.

---

## 11 — Multi-Provider + LangChain *(planned)*

📁 `11-multi-provider/` · *Coming soon*

Same code reviewer from 02, rebuilt with three providers (OpenAI, Claude, Gemini) via Vercel AI SDK and LangChain. Measure quality and cost tradeoffs. First intentional use of frameworks.

---

## 12 — Local Models — Ollama *(planned)*

📁 `12-local-models/` · *Coming soon*

Offline-capable RAG using Ollama + Llama/Mistral. Same 03 pipeline, zero API cost, runs entirely on your machine.

---

## 13 — Multi-Agent Systems *(planned)*

📁 `13-multi-agent/` · *Coming soon*

Orchestrator spawns specialist subagents in parallel. Real coordination, handoffs, shared memory, partial failure handling.

---

## 14 — Browser Agents + Long-Context *(planned)*

📁 `14-browser-agents/` · *Coming soon*

Browser agent using Playwright. Explores the 1M token context vs RAG tradeoff — when does full-context beat retrieval?

---

## Tech stack (all phases)

| Tool | Role | Notes |
|---|---|---|
| [`@google/genai`](https://github.com/googleapis/js-genai) | Gemini SDK | Official SDK — replaces deprecated `@google/generative-ai` |
| `gemini-2.5-flash` | Generation | Fast, 1M context, best default |
| `gemini-2.5-flash-lite` | Judge / eval model | $0.10/M tokens — cheapest stable option |
| `gemini-embedding-001` | Embeddings | Replaces deprecated `text-embedding-004` (Jan 2026), 1536 dims |
| PostgreSQL + pgvector | Vector store | HNSW index, cosine similarity |
| Redis | Semantic cache | Phase 05 |
| `@octokit/rest` | GitHub API | Phases 04 + 09 |
| `@modelcontextprotocol/sdk` | MCP server | Phase 09 |
| `zod` | Schema validation | Phase 09 tool parameters |
| No LangChain (Phases 01–09) | — | Raw SDK first — frameworks introduced in Phase 11 |

---

## Real-world issues hit and fixed

Every entry below is something that actually broke during this build:

| Issue | Phase | Root cause | Fix |
|---|---|---|---|
| `@google/generative-ai` import fails | 01–04 | Old SDK deprecated | Migrated to `@google/genai` |
| JSON truncated mid-response | 01 | `maxOutputTokens: 2048` too low | Raised to `8192` |
| Wrong date in changelog | 01 | Model hallucinated from training data | Injected `new Date().toISOString()` |
| All bug fixes merged into one entry | 01 | Prompt too vague | Added rule: one entry per commit |
| `text-embedding-004` deprecated | 03 | Model retired Jan 2026 | Migrated to `gemini-embedding-001` |
| HNSW index fails on 3072 dims | 03 | pgvector caps HNSW at 2000 dims | Used `outputDimensionality: 1536` |
| Agent skips `search_issues` on obvious duplicate | 04 | Model reads issue body and reasons correctly | Expected — let it reason |
| Free tier 20 RPD wall | 05 | Google cut free tier 92% Dec 2025 | Enable billing (Tier 1) |
| `retry in 11s` misleading on daily quota error | 05 | 429 = daily cap, not per-minute | Detect `GenerateRequestsPerDayPerProjectPerModel` — wait for midnight or enable billing |
| Agent says "no memories from past sessions" | 06 | Model not emitting `[REMEMBER:]` signals | Made instruction CRITICAL + MUST in system prompt |
| Meta-questions return no memories | 06 | Semantic similarity too low for "what did we discuss?" | Added recent memory fallback — always loads last 3 |
| DBeaver can't display vector column rows | 06 | DBeaver doesn't render `vector` type | Query without embedding column |
| `ai.tunings.create is not a function` | 08 | Tuning not in Gemini Developer API JS SDK | Use REST API or Vertex AI |
| Fine-tuning REST API 400 error | 08 | Gemini Developer API dropped tuning mid-2025 | Concept documented; requires Vertex AI for execution |

---

## Getting started

```bash
git clone https://github.com/your-username/genai-roadmap
cd genai-roadmap/01-changelog-gen
npm install
cp .env.example .env   # add GEMINI_API_KEY
node index.js
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey). Enable billing before Phase 05 — the free tier (20 RPD) is exhausted in minutes by pipeline work.

**API keys needed across the full roadmap:**

| Phase | Provider | Where |
|---|---|---|
| 01–09 | Gemini (billing enabled) | [aistudio.google.com](https://aistudio.google.com) |
| 04, 09 | GitHub PAT (fine-grained) | GitHub → Settings → Developer settings |
| 11 | OpenAI | [platform.openai.com](https://platform.openai.com) — $5 min topup |
| 11 | Anthropic | [console.anthropic.com](https://console.anthropic.com) — $5 free credits |
| 12 | None (Ollama local) | [ollama.ai](https://ollama.ai) — free |

---

## About

Built by a fullstack developer with 8 years of experience in Node.js, Express, Angular, and healthcare systems — transitioning into AI engineering by building, not watching tutorials.

The goal: go from "I've heard of RAG" to "I've built and debugged a production-shaped RAG system with evals, memory, and an MCP server" in under 6 weeks. This repo is the evidence it worked.

---

## References

- [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
- [Gemini API docs](https://ai.google.dev/gemini-api/docs)
- [pgvector](https://github.com/pgvector/pgvector)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [RAGAS paper](https://arxiv.org/abs/2309.15217)
- [ReAct paper](https://arxiv.org/abs/2210.03629)
- [Anthropic: Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Google AI Studio](https://aistudio.google.com)
