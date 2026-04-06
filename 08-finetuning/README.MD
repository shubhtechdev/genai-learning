# Fine-Tuning vs RAG vs Prompting — When and How

> Phase 8 of a hands-on GenAI → Agentic AI learning roadmap. Closes the fine-tuning knowledge gap: understanding when fine-tuning is the right tool, how training data is structured, and what the real cost-benefit tradeoff looks like — including a documented platform limitation that hit during development.

---

## What this phase covers

A head-to-head comparison of three approaches to improving LLM output quality on the same task (changelog generation):

| Approach   | How it works                       | Token cost per call         | Setup cost          |
| ---------- | ---------------------------------- | --------------------------- | ------------------- |
| Zero-shot  | System prompt only, no examples    | Lowest                      | None                |
| Few-shot   | System prompt + 10 examples inline | Medium (+375 tokens)        | None                |
| Fine-tuned | Examples baked into weights        | Lowest (no examples needed) | One-time tuning job |

**Key finding:** Few-shot closes ~80% of the quality gap with zero-shot at zero setup cost. Fine-tuning closes the remaining 20% while also eliminating the per-call example token overhead — the ROI depends entirely on call volume.

---

## The decision tree

Before reaching for fine-tuning, walk this tree:

```
Is the model failing because it doesn't know the information?
  YES → Use RAG. Fine-tuning doesn't inject knowledge, it changes behaviour.
  NO  → Keep going.

Is the model failing because it ignores formatting or style instructions?
  YES → Try few-shot first (5-20 examples in the prompt).
    Does few-shot work?
      YES → Stop here. Fine-tuning is unnecessary.
      NO  → Fine-tuning is a candidate.

Is the model failing consistently on a specific task type
  despite good prompts and few-shot examples?
  YES → Fine-tuning is the right tool.
  NO  → Fix your prompt.
```

The most common mistake: fine-tuning when the real problem is a vague prompt. Fine-tuning is expensive and slow to iterate. Adding examples to the system prompt is free and takes minutes. Always exhaust prompting first.

---

## What fine-tuning actually changes

Fine-tuning modifies the model's weights — its default behaviour when no prompt says otherwise. It learns style, format, tone, and domain-specific patterns from your examples.

**Fine-tuning does NOT:**

* Give the model new factual knowledge (use RAG for that)
* Make the model more accurate on knowledge questions
* Fix hallucination problems caused by insufficient context

**Fine-tuning IS good for:**

* Consistent output format across thousands of calls without repeating instructions
* Domain-specific vocabulary, tone, and writing style
* Tasks where prompting is inconsistent and the pattern is highly repetitive
* Reducing per-call token costs at scale when few-shot examples are large

---

## Project structure

```
phase8-finetuning/
├── .env                          # GEMINI_API_KEY
├── client.js                     # GoogleGenAI init
├── utils.js                      # withRetry
├── data/
│   ├── generate-training-data.js # Generates training.jsonl + validation.jsonl
│   ├── training.jsonl            # Fine-tuning training examples (20+)
│   └── validation.jsonl          # Validation examples (20% split)
├── tune.js                       # REST-based tuning job creator (see platform note)
└── compare.js                    # Zero-shot vs few-shot head-to-head comparison
```

---

## Setup

```bash
git clone <this-repo>
cd phase8-finetuning
npm install
cp .env.example .env
# Add: GEMINI_API_KEY
```

### Generate training data

```bash
node data/generate-training-data.js
# Creates training.jsonl (16 examples) and validation.jsonl (4 examples)
```

### Run the comparison

```bash
node compare.js
```

---

## Training data format

Each training example is a JSONL line with `text_input` (raw commits) and `output` (desired changelog):

```jsonl
{"text_input": "feat(auth): add JWT refresh token rotation\nfix(api): null pointer on empty payload", "output": "## Features\n- **JWT refresh token rotation**: Tokens now rotate on each refresh...\n\n## Bug Fixes\n- **Null pointer on empty API payload** _(medium)_: Server crashed with 500..."}
```

### Quality rules for training data

* Every output must follow your exact format — headers, bold titles, severity tags, detail sentences
* Vary input size — 1 commit, 3 commits, 8 commits
* Cover all categories — features, bugs, perf, refactoring, docs, removed, deps
* No bad examples — the model learns from everything including mistakes
* 80/20 train/validation split
* Minimum 20 examples, 50+ for better results

---

## The comparison output

Running `node compare.js` on the same 6 commits with both approaches:

**Zero-shot output (312 input tokens):**

```markdown
## Features
- New onboarding tour added for users
- Dashboard loading improved

## Bug fixes
- Billing credit issue (medium)
- API headers issue (low)
```

**Few-shot output (687 input tokens — 375 more):**

```markdown
## Features
- **Interactive product tour**: New users are guided through core features on
  first login. Can be dismissed and replayed from Help settings.

## Bug Fixes
- **Prorated credits not applied on plan downgrade** _(high)_: Users who
  downgraded mid-cycle received no credit for unused time. Fixed in billing
  calculation engine.
- **Rate limit headers missing from error responses** _(medium)_: 429 responses
  did not include Retry-After or X-RateLimit-* headers, making client retry
  logic impossible to implement correctly.
```

The quality difference is significant and consistent. Titles are specific, details explain user impact, severity is correctly assigned. This is what 10 inline examples buys you at the cost of 375 extra tokens per call.

---

## The fine-tuning ROI calculation

If few-shot requires 375 extra tokens per call, fine-tuning eliminates that overhead. The break-even calculation:

```
Monthly savings = calls/month × saved_tokens × price_per_token
                = 100,000 × 375 × $0.30/1M
                = $11.25/month

Tuning cost (one-time) = training_tokens × price
                       = 50,000 tokens × 5 epochs × $0.30/1M
                       = ~$0.075

Break-even = $0.075 / $11.25 = < 1 day of production traffic
```

At 100,000 calls/month, fine-tuning pays for itself in hours. At 1,000 calls/month, the savings are $0.11/month — not worth the operational overhead of maintaining a tuned model.

**The crossover point: approximately 10,000–20,000 calls/month** for a task with large few-shot examples.

---

## Platform limitation — documented

### What happened

During development, both the `@google/genai` JS SDK method (`ai.tunings.create()`) and the direct REST API call to `v1beta/tunedModels` returned errors:

```
Error: Tuning API error: {
  "error": {
    "code": 400,
    "message": "models/gemini-2.5-flash-001 is not found for CREATE TUNED MODEL at API version v1beta.",
    "status": "FAILED_PRECONDITION"
  }
}
```

### Root cause

Google deprecated supervised fine-tuning via the Gemini Developer API in mid-2025. The official changelog states: *"The last available tuning model, Gemini 1.5 Flash 001, has been shut down. Tuning is no longer supported on any models."*

Fine-tuning now requires **Vertex AI** — a separate Google Cloud product with its own billing, project setup, and authentication (gcloud ADC), which is outside the scope of this learning roadmap.

### What this means in practice

This is a real production concern, not just a learning-environment limitation. Any team that built fine-tuning pipelines on the Gemini Developer API before mid-2025 had their workflows broken without a migration path. This is why:

1. **Never build production infrastructure on free-tier or developer-tier APIs** for features that are marked as preview or experimental
2. **Monitor provider changelogs** — Google, OpenAI, and Anthropic all deprecate capabilities without long notice windows
3. **Abstract your model calls** behind a provider interface so swapping is possible (Phase 11 addresses this properly with multi-provider setup)

### Alternative paths

If you need fine-tuning in production:

* **Vertex AI** — Google's enterprise AI platform, supports Gemini 2.0 Flash tuning via Python SDK or REST. Requires a GCP project, billing, and `gcloud` auth setup.
* **OpenAI fine-tuning** — Supports GPT-4o-mini tuning via `POST /v1/fine_tuning/jobs`. Works with a standard API key. Covered in Phase 11.
* **Ollama + LoRA** — Local fine-tuning on open-source models (Llama, Mistral) using no API at all. Covered in Phase 12.

---

## Concepts learned

| Concept                                         | Status                      |
| ----------------------------------------------- | --------------------------- |
| Fine-tuning vs RAG vs prompting decision tree   | Understood                  |
| Training data format (JSONL input/output pairs) | Implemented                 |
| 80/20 train/validation split                    | Implemented                 |
| Few-shot prompting as fine-tuning alternative   | Implemented and measured    |
| Token cost delta between zero-shot and few-shot | Measured (375 tokens/call)  |
| Fine-tuning ROI calculation                     | Calculated                  |
| Gemini Developer API tuning deprecation         | Documented                  |
| Vertex AI as the alternative path               | Understood, not implemented |

---

## Key lessons

**The decision tree matters more than the implementation.** Knowing when NOT to fine-tune saves more time and money than knowing how to do it. Most production teams fine-tune too early — when prompting would have worked.

**Few-shot is underrated.** Adding 10 examples to a system prompt closes the majority of the quality gap with zero-shot, costs nothing to set up, and can be changed in seconds. Fine-tuning takes hours to retrain every time requirements change.

**Platform stability is a real engineering concern.** The Gemini Developer API dropped tuning support without a long-term migration window. This is a concrete example of why abstracting model providers matters (Phase 11) and why free/developer tiers should not be used for production-critical features.

**Training data quality is the bottleneck.** When fine-tuning is appropriate, the model learns exactly what you show it — including your mistakes. Sloppy training data produces a model that's consistently wrong in the same ways. Data curation takes longer than the tuning job itself.

---

## Tech stack

* **Runtime:** Node.js 20+ (ES modules)
* **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai)
* **Model:** `gemini-2.5-flash` (generation and comparison)
* **Fine-tuning:** Not available via Gemini Developer API as of mid-2025 — requires Vertex AI

---

## References

* [Gemini API tuning documentation](https://ai.google.dev/api/tuning)
* [Vertex AI supervised fine-tuning](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning)
* [OpenAI fine-tuning API](https://platform.openai.com/docs/guides/fine-tuning) — covered in Phase 11
* [Gemini API changelog — tuning deprecation](https://ai.google.dev/gemini-api/docs/changelog)
* [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
