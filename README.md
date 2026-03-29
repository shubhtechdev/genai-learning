
# GenAI → Agentic AI — Hands-On Learning Roadmap

A project-based roadmap for experienced backend developers transitioning into AI engineering. Built with Node.js and the official Google Gen AI SDK — no Python, no tutorials, no theory-first approach.

Each phase produces a real, working project. Concepts compound from phase to phase. By Phase 5 you have a portfolio that demonstrates the full stack of modern AI engineering.

---

## Philosophy

> Build first. Understand by doing. No frameworks until they earn their place.

- Every phase = one real project, 2–5 days to build
- Raw SDK calls before frameworks — you see the mechanics, not the abstraction
- Each project is independently runnable and portfolio-ready
- Mistakes and fixes documented — the learning is in the debugging

---

## The roadmap

| Phase                                               | Project                   | Core concept                            | Status      |
| --------------------------------------------------- | ------------------------- | --------------------------------------- | ----------- |
| [1 — LLM Basics](#phase-1--smart-changelog-generator) | Smart changelog generator | Prompting, structured output, streaming | ✅ Complete |
| [2 — Prompting](#phase-2--code-review-bot)            | Code review bot           | Prompt chaining, schema-first design    | ✅ Complete |
| [3 — RAG](#phase-3--docs-qa-api)                      | Docs Q&A API              | Embeddings, vector search, grounding    | ✅ Complete |
| [4 — Agents](#phase-4--github-issue-triage-agent)     | GitHub issue triage agent | ReAct loop, function calling            | ✅ Complete |
| [5 — Production](#phase-5--production-ai-hardening)   | Production AI hardening   | Caching, evals, observability, cost     | ✅ Complete |

---

## Repository structure

```
genai-roadmap/
├── README.md                      ← you are here
├── phase1-changelog-gen/          ← Smart changelog generator
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── commits.js
│   ├── prompts.js
│   ├── parser.js
│   ├── renderer.js
│   ├── git.js
│   ├── utils.js
│   └── index.js
├── phase2-code-reviewer/          ← Code review bot
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
├── phase3-docs-qa/                ← Docs Q&A with RAG
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
├── phase4-issue-triage/           ← GitHub triage agent
│   ├── README.md
│   ├── .env.example
│   ├── client.js
│   ├── utils.js
│   ├── github.js
│   ├── tools.js
│   ├── executor.js
│   ├── agent.js
│   └── index.js
└── phase5-production/             ← Production hardening
    ├── README.md
    ├── .env.example
    ├── client.js
    ├── utils.js
    ├── rateLimiter.js
    ├── logger.js
    ├── promptRegistry.js
    ├── fallback.js
    ├── cache.js
    ├── tokens.js
    ├── pipeline.js
    ├── db.js                      ← reused from Phase 3
    ├── retriever.js               ← reused from Phase 3
    ├── index.js
    ├── logs/
    │   └── .gitkeep
    └── evals/
        ├── runner.js
        └── cases.js
```

Each phase directory is independently runnable. Shared utilities (`client.js`, `utils.js`) are duplicated by design — no cross-phase imports, no monorepo tooling required.

---

## Shared foundations

These two files appear in every phase. Copy them in when starting a new phase:

**`client.js`** — GoogleGenAI initialisation:

```js
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

**`utils.js`** — retry with exponential backoff:

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
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed [${err.status}], retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

---

## Phase 1 — Smart Changelog Generator

📁 [`phase1-changelog-gen/`](./phase1-changelog-gen/) · [Full README](./phase1-changelog-gen/README.md)

Transforms raw `git log` output into a structured, categorised changelog using Gemini. Output is both JSON and Markdown.

**What you learn:**

- Prompt anatomy — system instruction vs user message
- Why you must inject dynamic values (dates, context) — models can't know them
- Defensive output parsing — strip fences, detect truncation, try/catch
- Streaming responses with `generateContentStream()`
- Retry with exponential backoff for 429 and 503 errors

**The critical lesson:** LLMs are text-in, text-out. Your entire job is crafting the input string. The quality of the output is a direct function of the quality of your prompt — including what examples you show, what rules you number, and what you explicitly forbid.

```bash
cd phase1-changelog-gen && npm install
node index.js
# Output: CHANGELOG.md
```

---

## Phase 2 — Code Review Bot

📁 [`phase2-code-reviewer/`](./phase2-code-reviewer/) · [Full README](./phase2-code-reviewer/README.md)

Runs a thorough code review on any source file. Detects bugs, security vulnerabilities, performance issues, and maintainability problems — with a concrete fix for each.

**What you learn:**

- Prompt chaining — two focused LLM calls beat one overloaded call
- Schema-first design — define the output contract before writing any prompt
- Output schema validation — LLMs drift from schemas, catch it at runtime
- Input validation before the API call — saves tokens, catches bad inputs early
- Few-shot prompting — show GOOD and BAD examples, not just instructions

**The critical lesson:** Treat LLM output as untrusted external data. Validate it the same way you'd validate any API response — schema check, type check, required field check. Silent schema drift breaks downstream code without throwing an error.

```bash
cd phase2-code-reviewer && npm install
node index.js samples/bad.js     # score: ~15/100, 7 issues
node index.js samples/good.js    # score: ~90/100, minimal issues
```

---

## Phase 3 — Docs Q&A API (RAG)

📁 [`phase3-docs-qa/`](./phase3-docs-qa/) · [Full README](./phase3-docs-qa/README.md)

Answers natural language questions grounded strictly in your documents. Uses Gemini embeddings + pgvector for semantic search, with source citations on every answer.

**What you learn:**

- Embeddings — numerical representations of meaning, not keywords
- pgvector + HNSW index — approximate nearest-neighbour search at scale
- Paragraph-aware chunking — chunking quality determines answer quality
- The ingestion vs query pipeline separation — different concerns, different cadences
- Grounded generation — "answer only from context" as a hallucination guard
- Cosine similarity thresholds — knowing when NOT to answer

**The critical lesson:** Chunking is the hardest part of RAG, not the model. A perfect model with bad chunks gives bad answers. The same embedding model must be used at both ingest time and query time — mixing models produces wrong results silently.

```bash
cd phase3-docs-qa && npm install
node ingest.js                                    # embed and store docs
node index.js "How do I use streaming?"           # grounded answer
node index.js "What is the capital of France?"    # "I don't have info..."
```

**Infrastructure required:** PostgreSQL with pgvector extension. See [Phase 3 README](./phase3-docs-qa/README.md) for Docker setup.

---

## Phase 4 — GitHub Issue Triage Agent

📁 [`phase4-issue-triage/`](./phase4-issue-triage/) · [Full README](./phase4-issue-triage/README.md)

Triages GitHub issues autonomously via the ReAct loop. Reads issues, searches for duplicates, applies labels, posts comments, closes duplicates — without human input.

**What you learn:**

- The ReAct loop — Reason → Act → Observe, repeated until done
- Function / tool calling — the model decides, you execute
- Tool executor pattern — model decisions decoupled from real API calls
- Conversation history as agent memory — the full `messages[]` array
- Three non-negotiable guardrails — iteration cap, destructive action logging, audit trail
- Why `temperature: 0` — agents must be deterministic and reproducible

**The critical lesson:** The model never calls GitHub. It says "I want to call `search_issues` with these arguments." You call GitHub. You tell the model what came back. It decides what to do next. Understanding this mechanical separation is understanding every agent framework ever built.

```bash
cd phase4-issue-triage && npm install
node index.js 4     # triage issue #4 — duplicate detection
node index.js 7     # triage issue #7 — standard labelling + comment
```

**Infrastructure required:** GitHub account + fine-grained PAT with Issues read/write. See [Phase 4 README](./phase4-issue-triage/README.md) for token setup.

---

## Phase 5 — Production AI Hardening

📁 [`phase5-production/`](./phase5-production/) · [Full README](./phase5-production/README.md)

Takes the Phase 3 RAG pipeline and hardens it for production: semantic caching, automated evals, structured logging, fallback chains, cost tracking, and prompt versioning. Every query flows through all 5 pillars.

**What you learn:**

- Semantic caching with Redis + embeddings — cache by meaning, not exact string. "How do I stream?" and "Show me streaming code" are the same cache key
- Eval framework — automated quality tests with `must_contain`, `must_not_contain`, `min_length`. Exit code 1 when quality drops below threshold — wires into CI
- Structured JSONL logging — latency, token count, cost, model version, prompt version per call. Query with `jq` instantly
- Fallback chains — Flash → Pro → degraded response. Never crash, always respond
- Prompt versioning — all prompts in a registry with version history. Roll back in one line
- Token counting before calls — `ai.models.countTokens()` for exact pre-call cost estimates
- Rate limiting — token bucket enforcing RPM ceiling across all API calls

**The critical lesson:** Logging is the first thing to build, not the last. Every other pillar is easier to verify and debug when you have structured logs from the start. And the free tier's 20 RPD cap is a hard wall for pipeline work — enable billing early. The cost for a learning project is negligible.

```bash
cd phase5-production && npm install
node index.js "How do I use streaming?"      # full production pipeline
node index.js "Show me streaming in Gemini"  # cache hit — $0.000000
node index.js eval                           # automated eval suite
node index.js eval v1.1 --verbose            # compare prompt versions
```

**Infrastructure required:** Redis (Docker), PostgreSQL + pgvector with docs ingested from Phase 3, Gemini API key with billing enabled (free tier hits 20 RPD wall immediately in pipeline work).

---

## Tech stack (all phases)

| Tool                                                     | Role             | Why this, not alternatives                                       |
| -------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| [`@google/genai`](https://github.com/googleapis/js-genai) | Gemini SDK       | Official SDK, replaces deprecated `@google/generative-ai`      |
| `gemini-2.5-flash`                                     | Generation model | Fast, free tier, 1M context — best default                      |
| `gemini-embedding-001`                                 | Embedding model  | Replaces deprecated `text-embedding-004` (Jan 2026)            |
| PostgreSQL + pgvector                                    | Vector store     | Production-grade, you likely already run Postgres                |
| `@octokit/rest`                                        | GitHub API       | Official, typed, well-maintained                                 |
| `dotenv`                                               | Config           | Simple, universal, no overhead                                   |
| No LangChain (yet)                                       | —               | Raw SDK first — understand the mechanics before the abstraction |

---

## Real-world issues hit and fixed

These aren't hypothetical — every entry below is something that broke during this build:

| Issue                                              | Phase | Root cause                                                   | Fix                                                                                                      |
| -------------------------------------------------- | ----- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `text-embedding-004` deprecated                  | 3     | Model retired Jan 2026                                       | Migrated to `gemini-embedding-001`                                                                     |
| HNSW index fails on 3072 dims                      | 3     | pgvector caps HNSW at 2000 dims                              | Used `outputDimensionality: 1536`                                                                      |
| JSON truncated mid-response                        | 1     | `maxOutputTokens: 2048` too low                            | Raised to `8192`                                                                                       |
| Wrong date in changelog                            | 1     | Model hallucinated from training data                        | Injected `new Date().toISOString()`                                                                    |
| All bug fixes merged into one entry                | 1     | Prompt too vague                                             | Added rule: one entry per commit                                                                         |
| Agent skips `search_issues` on obvious duplicate | 4     | Model reads issue body intelligently                         | Expected behaviour — let it reason                                                                      |
| Free tier 20 RPD wall                              | 5     | Google cut gemini-2.5-flash free tier 92% in Dec 2025        | Enable billing (Tier 1) — costs ~₹1/day for learning                                                   |
| Retry delay misleading on RPD error                | 5     | 429 says "retry in 11s" but it's a daily cap, not per-minute | Recognise `GenerateRequestsPerDayPerProjectPerModel` in error — wait until midnight or enable billing |

---

## Getting started

Pick a phase, clone the repo, and run:

```bash
git clone https://github.com/your-username/genai-roadmap
cd genai-roadmap/phase1-changelog-gen
npm install
cp .env.example .env   # add your GEMINI_API_KEY
node index.js
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey). No credit card needed for the free tier.

---

## About

Built by a fullstack developer with 8 years of experience in Node.js, Express, Angular, and healthcare systems — transitioning into AI engineering by building, not watching tutorials.

The goal was to go from "I've heard of RAG" to "I've built and debugged a production-shaped RAG system" in under 3 weeks. This repo is the evidence it worked.

---

## References

- [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
- [Gemini API docs](https://ai.google.dev/gemini-api/docs)
- [pgvector](https://github.com/pgvector/pgvector)
- [ReAct paper](https://arxiv.org/abs/2210.03629) — the agent loop, explained
- [Google AI Studio](https://aistudio.google.com) — free API keys
