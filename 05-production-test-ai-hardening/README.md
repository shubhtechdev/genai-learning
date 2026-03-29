
# Production AI Hardening — Caching, Evals, Logging, Fallbacks, Prompt Versioning

> Phase 5 of a hands-on GenAI → Agentic AI learning roadmap. Takes the Phase 3 RAG pipeline from "works on my machine" to production-ready: semantic caching, automated evals, structured logging, fallback chains, cost tracking, and prompt versioning.

---

## What it does

Wraps the Phase 3 Docs Q&A pipeline with a full production layer. Every query flows through semantic cache → token counting → fallback chain → structured logging → cache store. Every prompt change is tested against an automated eval suite before deployment.

**Run a query (with full production instrumentation):**

```bash
node index.js "How do I use streaming with Gemini?"
```

```
Input tokens: 847
[generate] model=gemini-2.5-flash latency=823ms tokens=1102 cost=$0.000281

============================================================
To use streaming with Gemini, call generateContentStream() instead of
generateContent(). It returns an async iterable...

Sources : gemini-quickstart.md
Model   : gemini-2.5-flash
Version : v1.2
Cache   : MISS
Tokens  : 1102
Cost    : $0.000281
```

**Same question again — semantic cache hit:**

```bash
node index.js "Show me how to stream responses from Gemini"
```

```
[generate] [CACHE HIT] model=cache latency=43ms tokens=0 cost=$0.000000

Sources : (cached)
Model   : cache
Cache   : HIT (0.961)
Tokens  : 0
Cost    : $0.000000
```

**Run the eval suite:**

```bash
node index.js eval
```

```
Running 5 evals against prompt version: v1.2
============================================================
  eval-001 (factual)... PASS
  eval-002 (factual)... PASS
  eval-003 (grounding)... PASS
  eval-004 (code)... PASS
  eval-005 (factual)... FAIL — Missing required: "1M"
============================================================
Result: 4/5 passed (80%)
Prompt version: v1.2
Saved to evals/results-v1.2-1743000000000.json
```

---

## Concepts covered

| Concept                                              | Where it appears                               |
| ---------------------------------------------------- | ---------------------------------------------- |
| Semantic caching (meaning-based, not string-based)   | `cache.js` — embeddings + cosine similarity |
| Eval framework — automated prompt quality tests     | `evals/runner.js` + `evals/cases.js`       |
| Structured logging — latency, tokens, cost, version | `logger.js` — JSONL per day                 |
| Fallback chains — Flash → Pro → degraded          | `fallback.js`                                |
| Prompt versioning — prompts as code                 | `promptRegistry.js`                          |
| Token counting before API calls                      | `tokens.js` — `ai.models.countTokens()`   |
| Rate limiting — token bucket                        | `rateLimiter.js`                             |
| Retry with jitter — no thundering herd              | `utils.js`                                   |
| Cost calculation per call                            | `logger.js` — `calculateCost()`           |

---

## Project structure

```
phase5-production/
├── .env                     # GEMINI_API_KEY + DATABASE_URL + REDIS_URL
├── client.js                # GoogleGenAI init + rate limiter export
├── utils.js                 # withRetry() with jitter
├── rateLimiter.js           # Token bucket — enforces RPM ceiling
├── logger.js                # Structured JSONL logging + cost calculation
├── promptRegistry.js        # All prompts versioned — never inline in code
├── fallback.js              # Model fallback chain with graceful degradation
├── cache.js                 # Semantic cache — Redis + embedding similarity
├── tokens.js                # Token counting before API calls
├── pipeline.js              # Hardened query — wires all 5 pillars
├── db.js                    # Postgres pool (from Phase 3)
├── retriever.js             # Vector similarity search (from Phase 3)
├── evals/
│   ├── runner.js            # Eval runner — scores answers, saves results
│   └── cases.js             # Test cases — must_contain, must_not_contain
├── logs/
│   └── 2026-03-28.jsonl     # One JSONL log file per day
└── index.js                 # CLI — queries and eval runs
```

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL with pgvector (from Phase 3 — docs already ingested)
- Redis
- Gemini API key with **billing enabled** (see note below)

### Start Redis

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Install

```bash
git clone <this-repo>
cd phase5-production
npm install
```

### Configure

```bash
cp .env.example .env
```

```
GEMINI_API_KEY=your_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/docsqa
REDIS_URL=redis://localhost:6379
```

### Run

```bash
# Ask a question
node index.js "How do I generate embeddings?"

# Ask the same question differently — should be a cache hit
node index.js "What is the embedding API call in Gemini?"

# Run evals against current prompt version
node index.js eval

# Run evals against a specific version with verbose output
node index.js eval v1.1 --verbose

# Compare two versions
node index.js eval v1.1 > v1.1.txt && node index.js eval v1.2 > v1.2.txt
diff v1.1.txt v1.2.txt
```

---

## Important — free tier quota

The free tier caps `gemini-2.5-flash` at **20 requests per day** (reduced from 250 in December 2025). Phase 5 makes 3–4 API calls per query, so you'll hit this within a few runs.

**Enable billing** — it costs essentially nothing for a learning project:

1. Go to [aistudio.google.com](https://aistudio.google.com) → Billing
2. Link a Google Cloud billing account
3. Tier 1 activates instantly — 1,500 RPD, no minimum spend

At `gemini-2.5-flash` pricing ($0.30/M input tokens, $2.50/M output tokens), running all 5 evals multiple times per day costs well under ₹1.

**While waiting for billing:** Switch the model chain in `fallback.js` to `gemini-2.5-flash-lite` first — it has 1,000 RPD on the free tier.

---

## Architecture — the 5 pillars

Every query flows through all 5 pillars in sequence:

```
Incoming question
        │
        ▼
┌───────────────────────────────────────────┐
│ Pillar 1: Semantic cache check            │
│ Embed question → cosine similarity search │
│ Threshold: 0.92 similarity               │
└──────────────┬──────────┬─────────────────┘
          Cache HIT   Cache MISS
               │           │
               │           ▼
               │  ┌─────────────────────────┐
               │  │ Retrieve chunks         │
               │  │ (pgvector from Phase 3) │
               │  └──────────┬──────────────┘
               │             │
               │             ▼
               │  ┌─────────────────────────┐
               │  │ Pillar 5: Get versioned │
               │  │ prompt from registry    │
               │  └──────────┬──────────────┘
               │             │
               │             ▼
               │  ┌─────────────────────────┐
               │  │ Bonus: Count tokens     │
               │  │ before calling          │
               │  └──────────┬──────────────┘
               │             │
               │             ▼
               │  ┌─────────────────────────┐
               │  │ Pillar 4: Fallback call │
               │  │ Flash → Pro → degraded  │
               │  └──────────┬──────────────┘
               │             │
               │             ▼
               │  ┌─────────────────────────┐
               │  │ Pillar 3: Log result    │
               │  │ latency, tokens, cost   │
               │  └──────────┬──────────────┘
               │             │
               │             ▼
               │  ┌─────────────────────────┐
               │  │ Pillar 1: Store in      │
               │  │ semantic cache          │
               │  └──────────┬──────────────┘
               │             │
               └──────┬──────┘
                      │
                      ▼
              Answer + metadata
```

---

## Pillar 1 — Semantic caching

**Why not a regular cache?**

A keyword cache treats "How do I stream?" and "Show me streaming code" as different keys. They return the same answer. A semantic cache embeds both questions, computes cosine similarity, and recognises them as equivalent (similarity ~0.96).

**The similarity threshold**

`0.92` is deliberately high. At this threshold, only near-identical questions get cache hits. Lower thresholds (0.80) cache more aggressively but risk serving a slightly-off answer for a related-but-different question. Tune this based on your domain — narrow technical docs can go lower safely.

**Production note:** The cache implementation here does a linear scan across all Redis keys to find the most similar entry. This works for hundreds of entries. For thousands of cached queries, replace with Redis vector search (RediSearch module) which indexes vectors natively and searches in O(log n).

---

## Pillar 2 — Eval framework

Evals answer one question: "did my prompt change make things better or worse?"

**Three types of eval cases:**

```
factual    — answer must contain specific terms ("npm install", "@google/genai")
grounding  — answer must refuse rather than hallucinate ("don't have", "not enough")
code       — answer must contain specific code patterns ("for await", "generateContentStream")
```

**The exit code is intentional:**

```js
if (results.pct < 80) process.exit(1);
```

Wire `node index.js eval` into your CI pipeline. Prompt changes that drop quality below 80% never reach production — the deploy fails automatically.

**How to add a new eval case:**

```js
// evals/cases.js
{
  id: "eval-006",
  category: "factual",
  question: "What happens when you exceed the rate limit?",
  must_contain: ["429", "retry"],
  must_not_contain: [],
  min_length: 40,
}
```

---

## Pillar 3 — Structured logging

Every call produces a JSONL entry:

```json
{"timestamp":"2026-03-28T10:23:11Z","type":"generate","model":"gemini-2.5-flash","latency_ms":823,"input_tokens":847,"output_tokens":255,"total_tokens":1102,"cost_usd":0.000281,"prompt_version":"v1.2","cache_hit":false,"success":true}
{"timestamp":"2026-03-28T10:23:55Z","type":"generate","model":"cache","latency_ms":43,"total_tokens":0,"cost_usd":0,"cache_hit":true,"success":true}
```

**Why JSONL?**

- One record per line — trivial to `tail -f` in production
- Every record is valid JSON — pipe into `jq` for instant filtering
- Append-only — no locking, no corruption

**Useful queries on your log files:**

```bash
# Total cost today
cat logs/2026-03-28.jsonl | jq '[.cost_usd // 0] | add'

# Average latency by model
cat logs/2026-03-28.jsonl | jq -s 'group_by(.model) | map({model: .[0].model, avg_ms: (map(.latency_ms) | add / length)})'

# Cache hit rate
cat logs/2026-03-28.jsonl | jq -s '{hits: map(select(.cache_hit)) | length, total: length}'

# All failed calls
cat logs/2026-03-28.jsonl | jq 'select(.success == false)'
```

---

## Pillar 4 — Fallback chains

**Model chain:**

```
gemini-2.5-flash  →  gemini-2.5-pro  →  degraded response
```

**What triggers a fallback:**

- `429` — rate limit exceeded
- `500` — internal model error
- `503` — model overloaded
- Any message containing "overloaded"

**What does NOT trigger a fallback:**

- `400` — bad request (your prompt has an issue — fix the prompt)
- `401` / `403` — auth error (fix your API key)
- Any validation error — surface immediately, don't mask with a fallback

**The degraded response:**

```json
{
  "text": "The AI service is temporarily unavailable. Please try again in a moment.",
  "model": "degraded",
  "degraded": true
}
```

Never crash. Never throw an unhandled error to the user. A degraded response with a clear message is always better than a 500.

---

## Pillar 5 — Prompt versioning

**The rule:** Prompts are code. They live in version control. They have a history. They can be rolled back.

```js
// Never do this:
const systemPrompt = `Answer using only the context...`;  // hardcoded, no history

// Always do this:
const { text: systemPrompt, version } = getPrompt("rag_system");
// version is logged with every API call
```

**How to update a prompt:**

1. Add a new version to `promptRegistry.js`
2. Run evals against the new version: `node index.js eval v1.3`
3. If eval score improves, change `current: "v1.3"`
4. If eval score drops, keep `current: "v1.2"` — old version is still there

**Old versions are never deleted.** You need them for:

- Comparing quality over time
- Rolling back when a "better" version turns out to be worse in production
- Reproducing historical results during debugging

---

## Rate limiting and quota management

**Free tier reality (post December 2025):**

| Model                     | Free RPM | Free RPD | Paid RPM (Tier 1) |
| ------------------------- | -------- | -------- | ----------------- |
| `gemini-2.5-flash`      | 10       | 20       | 150–300          |
| `gemini-2.5-flash-lite` | 15       | 1,000    | 1,000+            |
| `gemini-embedding-001`  | 5        | 100      | 1,000+            |

Phase 5 makes 3–4 calls per query. At 20 RPD, you'll exhaust the free tier in 5–6 queries. Enable billing — the cost for a learning project is negligible.

**The rate limiter** (`rateLimiter.js`) enforces a ceiling of 8 RPM across all calls, giving headroom below the 10 RPM free tier limit. Adjust to 120 RPM after enabling billing.

---

## Lessons learned

**The free tier is a trap for pipeline work.** Single-call demos work fine. Multi-step pipelines (RAG, agents, evals) exhaust the daily quota immediately. Budget ₹50–100/month for API calls during active development — it removes the biggest friction point.

**Logging should be the first thing you build.** Every other pillar is easier to debug and verify when you have structured logs. Build it before caching, before fallbacks, before everything.

**Semantic caching changes the economics of AI products.** A cache hit costs $0 and returns in ~50ms vs $0.0003 and 800ms for a real call. For any product where users ask similar questions repeatedly — docs Q&A, customer support, internal tools — a semantic cache with a high similarity threshold pays for itself immediately.

**Evals are the only way to know if a prompt change helped.** Intuition is wrong surprisingly often. A prompt change that "feels" better frequently scores worse on eval cases. Measure first, deploy second.

---

## Tech stack

- **Runtime:** Node.js 20+ (ES modules)
- **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai)
- **Generation model:** `gemini-2.5-flash` with `gemini-2.5-pro` fallback
- **Embedding model:** `gemini-embedding-001` (1536 dims)
- **Cache:** Redis 7 via [`ioredis`](https://github.com/redis/ioredis)
- **Vector DB:** PostgreSQL + pgvector (from Phase 3)
- **No frameworks** — raw SDK, intentional

---

## Learning context

This project is Phase 5 — the final phase — of a 5-phase GenAI learning roadmap. See the [root README](../README.md) for the full picture.

| Phase       | Project                           | Key concept                                   |
| ----------- | --------------------------------- | --------------------------------------------- |
| 1           | Changelog generator               | LLM basics, prompting                         |
| 2           | Code review bot                   | Prompt chaining, structured output            |
| 3           | Docs Q&A (RAG)                    | Embeddings, vector search, grounding          |
| 4           | GitHub triage agent               | ReAct loop, function calling                  |
| **5** | **Production hardening** ← | **Caching, evals, observability, cost** |

---

## References

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
- [pgvector](https://github.com/pgvector/pgvector)
- [ioredis](https://github.com/redis/ioredis)
- [Google AI Studio — enable billing](https://aistudio.google.com)
