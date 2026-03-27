# Docs Q&A API — RAG with pgvector and Gemini Embeddings

> Phase 3 of a hands-on GenAI → Agentic AI learning roadmap. Built to understand Retrieval-Augmented Generation (RAG): embeddings, vector databases, chunking strategy, and grounded answer generation.

---

## What it does

Ingests markdown and PDF documents into a vector database, then answers natural language questions grounded strictly in those documents — with source citations and similarity scores.

**Ingest your docs (run once):**
```bash
node ingest.js
# Found 3 documents to ingest
# Ingesting: gemini-quickstart.md → 6 chunks
# Ingesting: gemini-embeddings.md → 5 chunks
# Ingesting: gemini-models.md → 4 chunks
# Done. Total chunks in DB: 15
```

**Ask questions:**
```bash
node index.js "How do I use streaming with Gemini?"
node index.js "What is the rate limit on the free tier?"
node index.js "What is the capital of France?"   # → "I don't have enough information..."
```

**Output:**
```
============================================================
ANSWER
============================================================
To use streaming with Gemini, call `generateContentStream()` instead of
`generateContent()`. It returns an async iterable of chunks:

  for await (const chunk of stream) {
    process.stdout.write(chunk.text);
  }

This is particularly useful for long responses where you want to show
output as it is generated rather than waiting for the full response. [1]

Sources: gemini-quickstart.md
Chunks used: 3 | Top similarity: 0.847
```

---

## Concepts covered

| Concept | Where it appears |
|---|---|
| Embeddings — what they are and why | `embedder.js` + README architecture section |
| Gemini embedding model (`gemini-embedding-001`) | `embedder.js` |
| pgvector + HNSW index | `db.js` + SQL setup |
| Paragraph-aware chunking with overlap | `chunker.js` |
| Cosine similarity search | `retriever.js` — `<=>` operator |
| Grounded generation (no hallucination) | `generator.js` — "answer from context only" |
| Source citation in answers | `generator.js` — `[1]`, `[2]` notation |
| Ingestion vs query pipeline separation | `ingest.js` vs `query.js` |
| PDF ingestion | `pdf-loader.js` |

---

## Project structure

```
phase3-docs-qa/
├── .env                  # GEMINI_API_KEY + DATABASE_URL
├── client.js             # GoogleGenAI init
├── utils.js              # withRetry() — exponential backoff
├── db.js                 # Postgres pool + query helper
├── chunker.js            # Paragraph-aware text chunker with overlap
├── embedder.js           # Embed text via gemini-embedding-001
├── ingest.js             # Ingestion pipeline — run once per doc change
├── retriever.js          # pgvector cosine similarity search
├── generator.js          # Grounded answer generation with citations
├── query.js              # Query pipeline — wires retriever + generator
├── pdf-loader.js         # PDF text extraction for ingestion
├── index.js              # CLI entry point
└── docs/
    ├── gemini-quickstart.md
    ├── gemini-embeddings.md
    └── gemini-models.md
```

---

## Setup

### Prerequisites
- Node.js 20+
- Docker with PostgreSQL running
- pgvector extension (included in `pgvector/pgvector` Docker image)
- Free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Install

```bash
git clone <this-repo>
cd phase3-docs-qa
npm install
```

### Start Postgres with pgvector

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### Database setup (run once)

```bash
docker exec -it pgvector psql -U postgres -c "CREATE DATABASE docsqa;"
docker exec -it pgvector psql -U postgres -d docsqa
```

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB DEFAULT '{}'
);

-- Use halfvec cast for HNSW — required for dims > 1000 in some pgvector versions
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops);
```

### Configure

```bash
cp .env.example .env
```

```
GEMINI_API_KEY=your_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/docsqa
```

### Ingest and query

```bash
node ingest.js
node index.js "How do I generate embeddings?"
```

---

## Architecture — the two pipelines

### Why two separate pipelines?

RAG has two completely different workflows with different triggers, different frequencies, and different failure modes. Mixing them in one file is a common mistake that makes both harder to debug and maintain.

```
INGESTION (run once, or when docs change)
  docs/*.md + *.pdf
       │
       ▼
  Chunker          → splits into ~500 char paragraphs with 100 char overlap
       │
       ▼
  Embedder         → gemini-embedding-001, 1536 dims, batches of 20
       │
       ▼
  pgvector DB      → stored with HNSW index for fast similarity search


QUERY (every request)
  User question
       │
       ▼
  Embed question   → same model, same dims — critical
       │
       ▼
  Vector search    → cosine similarity, top 5 chunks above 0.5 threshold
       │
       ▼
  Generator        → Gemini 2.5 Flash, answers ONLY from retrieved context
       │
       ▼
  Answer + sources + similarity scores
```

---

## Key implementation decisions

### Embedding model: `gemini-embedding-001` at 1536 dimensions

`text-embedding-004` was deprecated January 2026. The replacement is `gemini-embedding-001`, which supports Matryoshka Representation Learning (MRL) — you can request 768, 1536, or 3072 dimensions. We use 1536 because:
- 3072 exceeds pgvector's HNSW index limit of 2000 dimensions
- 1536 stays safely under the limit with standard indexing
- Quality difference between 1536 and 3072 is negligible at this scale

Always set `outputDimensionality` explicitly — never rely on the default in case it changes.

### Paragraph-aware chunking over fixed-size splitting

Naive fixed-size chunking (split every 500 characters) frequently cuts mid-sentence or mid-code block, producing chunks that are semantically meaningless. The chunker here:
1. Splits on double newlines (paragraph boundaries) first
2. Only splits within a paragraph if it exceeds the size limit
3. Carries 100-character overlap into the next chunk to avoid losing context at boundaries

This produces chunks that are complete thoughts — dramatically improving retrieval quality.

### The grounding instruction

```js
"Answer the question using ONLY the provided context below."
"If the context does not contain enough information, say so. Do not guess."
```

Without this instruction the model blends its training knowledge with your docs. The answer might be correct — but you can't tell whether it came from your docs or from training data. With grounding, every answer is verifiable against the source chunks.

### Similarity threshold at 0.5

Chunks below 0.5 cosine similarity are discarded before generation. Without a threshold, you pass irrelevant chunks to the model and it hallucinates connections between unrelated content. If no chunks exceed the threshold, the answer is "I don't have enough information" — which is the correct honest response.

---

## The three RAG failure modes

| Failure | Symptom | Fix |
|---|---|---|
| Retrieval miss | "I don't have info" but the doc covers it | Lower `MIN_SIMILARITY` to 0.4, check chunking didn't split a key section |
| Context dilution | Answer mixes topics or contradicts itself | Lower `TOP_K` to 3, raise `MIN_SIMILARITY` to 0.65 |
| Hallucination bleed | Answer is plausible but cites nothing | Strengthen grounding instruction, add "if uncertain, say so" |

---

## Lessons learned

**Chunking is the hardest part of RAG.** Model quality, embedding model, and vector search are largely solved problems. The quality of your answers is almost entirely determined by whether the right text ends up in the right chunk.

**The embedding model must match between ingestion and query.** Using different models silently produces wrong results — cosine similarity between vectors from different models is mathematically meaningless. There is no error thrown.

**Similarity scores tell you when not to answer.** A top similarity of 0.45 means your docs don't cover this question. Return "I don't know" — it is far better than a hallucinated answer the user might act on.

---

## Tech stack

- **Runtime:** Node.js 20+ (ES modules)
- **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai)
- **Embedding model:** `gemini-embedding-001` (1536 dims)
- **Generation model:** `gemini-2.5-flash`
- **Vector DB:** PostgreSQL + [pgvector](https://github.com/pgvector/pgvector)
- **PDF parsing:** `pdf-parse`
- **DB client:** `pg` (node-postgres)

---

## Learning context

This project is Phase 3 of a 5-phase GenAI learning roadmap. See the [root README](../README.md) for the full picture.

| Phase | Project | Key concept |
|---|---|---|
| 1 | Changelog generator | LLM basics, prompting |
| 2 | Code review bot | Prompt chaining, structured output |
| **3** | **Docs Q&A (RAG)** ← | **Embeddings, vector search, grounding** |
| 4 | GitHub triage agent | ReAct loop, tool calling |
| 5 | Production hardening | Caching, evals, observability |

---

## References

- [pgvector](https://github.com/pgvector/pgvector)
- [Gemini Embeddings API](https://ai.google.dev/gemini-api/docs/embeddings)
- [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
- [Google AI Studio — free API key](https://aistudio.google.com/app/apikey)
