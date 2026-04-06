# RAG Eval Harness — LLM-as-Judge + RAGAS Metrics

> Phase 7 of a hands-on GenAI → Agentic AI learning roadmap. Replaces the brittle keyword-matching evals from Phase 5 with a proper evaluation framework: four RAGAS-aligned metrics scored by an LLM judge, with native JSON mode, CI-ready exit codes, and correct handling of adversarial out-of-scope questions.

---

## What it does

Evaluates the Phase 6 RAG pipeline across five test cases using four quality metrics. Each case runs retrieval, generates an answer, then scores it from four angles using `gemini-2.5-flash-lite` as the judge.

```bash
node runner.js
```

```
Running 5 eval cases against Phase 6 RAG pipeline
Judge model: gemini-2.5-flash-lite | Generator model: gemini-2.5-flash

──────────────────────────────────────────────────
eval-001 [retrieval_accuracy]
Q: What is contextual retrieval and how does it improve RAG?
  Retrieved 5 chunks
  Answer: Contextual retrieval prepends an LLM-generated description...
  Scores → faithfulness: 0.95 | relevance: 0.92 | precision: 0.88 | recall: 0.90
  Overall: 0.91

──────────────────────────────────────────────────
eval-004 [grounding]
Q: What is the capital of France?
  Retrieved 0 relevant chunks
  Answer: I don't have enough information in the docs to answer this.
  Scores → faithfulness: 1.00 | relevance: 0.00 | precision: 0.00 | recall: n/a
  Grounding test: PASS — correctly refused

══════════════════════════════════════════════════
EVAL RESULTS SUMMARY
══════════════════════════════════════════════════
  faithfulness         0.891 ████████████████     PASS
  answer_relevance     0.876 █████████████████    PASS
  context_precision    0.820 ████████████████     PASS
  context_recall       0.847 ████████████████     PASS
  overall              0.859 █████████████████    PASS

Full results saved to eval-results-1743000000000.json
```

---

## Concepts covered

| Concept                       | Where it appears                                                  |
| ----------------------------- | ----------------------------------------------------------------- |
| LLM-as-judge pattern          | `judge.js`— separate model evaluates outputs                   |
| Faithfulness scoring          | `judge.js`— is the answer grounded in retrieved context?       |
| Answer relevance scoring      | `judge.js`— does the answer address the question?              |
| Context precision scoring     | `judge.js`— are retrieved chunks relevant to the question?     |
| Context recall scoring        | `judge.js`— does context contain info needed for ground truth? |
| Native JSON mode              | `judge.js`—`responseMimeType: "application/json"`            |
| Adversarial / grounding tests | `evalCases.js`—`expectedBehaviour: "refusal"`                |
| Case-type-aware scoring       | `runner.js`— refusal cases scored on faithfulness only         |
| CI-ready exit codes           | `runner.js`—`process.exit(1)`when overall < 0.70             |
| Parallel metric scoring       | `runner.js`—`Promise.all()`for all four metrics per case     |
| Score aggregation             | `runner.js`— avg per metric, nulls excluded                    |

---

## Project structure

```
phase7-rag-evals/
├── .env                  # GEMINI_API_KEY + DATABASE_URL (Phase 6 DB)
├── client.js             # GoogleGenAI init
├── utils.js              # withRetry
├── db.js                 # Postgres pool (points at research_assistant DB)
├── retriever.js          # Vector similarity search (reused from Phase 6)
├── generator.js          # Grounded answer generation (reused from Phase 6)
├── judge.js              # Four RAGAS-aligned scoring functions
├── evalCases.js          # Test cases with ground truth and expected behaviour
├── runner.js             # Eval runner — orchestrates all cases, prints summary
└── eval-results-*.json   # Timestamped result files (gitignored)
```

---

## Setup

### Prerequisites

* Phase 6 research assistant fully set up (docs ingested, DB populated)
* Same `DATABASE_URL` pointing at the `research_assistant` database

### Install

```bash
git clone <this-repo>
cd phase7-rag-evals
npm install
cp .env.example .env
# Same GEMINI_API_KEY and DATABASE_URL as Phase 6
```

### Run

```bash
# Full eval suite
node runner.js

# Exits with code 0 if overall >= 0.70
# Exits with code 1 if below threshold — wires into CI
```

### Wire into CI (GitHub Actions example)

```yaml
- name: Run RAG evals
  run: node runner.js
  # Job fails automatically if exit code is 1
```

---

## The four RAGAS metrics

### Faithfulness — did the model make anything up?

```
Input:  retrieved context chunks + generated answer
Output: 0.0 (pure hallucination) → 1.0 (fully grounded)
```

The judge reads every claim in the answer and checks whether it is supported by the retrieved chunks. Unsupported claims are listed explicitly in the response.

Target: ≥ 0.85. Below this, your generator is hallucinating — strengthen the grounding instruction in the system prompt.

### Answer relevance — did the answer address the question?

```
Input:  question + generated answer
Output: 0.0 (completely off-topic) → 1.0 (directly answers)
```

The judge evaluates whether the answer is a good response to what was actually asked, independent of whether it is grounded. A perfectly grounded but off-topic answer scores high faithfulness and low relevance.

Target: ≥ 0.80. Below this, your generator is drifting — check if context chunks are pulling the answer in the wrong direction.

### Context precision — did retrieval return the right chunks?

```
Input:  question + retrieved chunks
Output: 0.0 (all chunks irrelevant) → 1.0 (all chunks relevant)
```

The judge evaluates each retrieved chunk independently for relevance to the question. A score of 0.60 means roughly 60% of retrieved chunks were relevant — the other 40% were noise that diluted the context.

Target: ≥ 0.75. Below this, raise `MIN_SIMILARITY` in the retriever or improve chunking quality.

### Context recall — was the needed information in the chunks?

```
Input:  question + ground truth answer + retrieved chunks
Output: 0.0 (needed info missing) → 1.0 (all needed info present)
```

The only reference-dependent metric — requires a manually written ground truth answer. The judge checks whether the information needed to produce the ground truth is present in the retrieved chunks.

Target: ≥ 0.80. Below this, your docs don't cover the topic or chunking split the relevant content across chunk boundaries.

---

## The adversarial grounding test

Eval case 004 asks "What is the capital of France?" — a question your tech docs cannot answer.

Expected scores:

* Faithfulness: ~1.00 — "I don't have enough information" is fully grounded
* Answer relevance: ~0.00 — refusing is not a relevant answer to the question
* Context precision: ~0.00 — no retrieved chunks are relevant

This is correct behaviour, not a failure. The runner handles it explicitly:

```js
// evalCases.js
{ expectedBehaviour: "refusal" }

// runner.js — only faithfulness scored for refusal cases
// High faithfulness + low relevance = correct refusal
// Low faithfulness + high relevance = dangerous hallucination
```

The critical insight: faithfulness and relevance conflict by design on out-of-scope questions. A system that always refuses gets 1.0 faithfulness / 0.0 relevance. A system that always fabricates gets 0.0 faithfulness / high relevance. You want both high — which only happens when your docs actually cover the question.

---

## What the scores tell you

| Low score             | Root cause                                                     | Fix                                                                  |
| --------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Low faithfulness      | Generator hallucinating beyond context                         | Strengthen "answer only from context" instruction                    |
| Low answer relevance  | Generator going off-topic                                      | Check if noisy chunks are pulling the answer sideways                |
| Low context precision | Retriever returning irrelevant chunks                          | Raise `MIN_SIMILARITY`, improve chunk size, add metadata filtering |
| Low context recall    | Docs don't cover the topic, or chunking split relevant content | Add more documentation, reduce chunk size, add overlap               |

---

## Key implementation decisions

### LLM-as-judge vs keyword matching

Phase 5 evals checked whether the answer contained specific strings like `"npm install"` or `"@google/genai"`. This is brittle — a correct answer phrased differently fails. It cannot measure quality, reasoning accuracy, or grounding.

LLM-as-judge reads the full answer and scores nuanced qualities. It can recognise a correct answer regardless of phrasing, detect claims that go beyond the context, and distinguish between a relevant and an irrelevant response.

The tradeoff: judge calls cost tokens. At `gemini-2.5-flash-lite` pricing ($0.10/M input tokens), running all four metrics on five eval cases costs approximately $0.001. Negligible.

### Native JSON mode eliminates defensive parsing

```js
config: {
  responseMimeType: "application/json",
  temperature: 0,
}
```

The model is constrained to output valid JSON. No `try/catch` around `JSON.parse`, no stripping markdown fences, no schema validation. The response is always parseable. Temperature 0 ensures the judge is deterministic — running the same eval twice produces the same scores.

### Parallel metric scoring per case

```js
const [faithfulness, relevance, precision, recall] = await Promise.all([
  scoreFaithfulness(answer, chunks),
  scoreAnswerRelevance(question, answer),
  scoreContextPrecision(question, chunks),
  scoreContextRecall(question, groundTruth, chunks),
]);
```

All four metrics are independent — they can be scored simultaneously. `Promise.all()` cuts per-case eval time from 4× sequential latency to 1× parallel latency.

### Separate judge and generator models

The judge model (`gemini-2.5-flash-lite`) is different from the generator model (`gemini-2.5-flash`). This is intentional. A model judging its own output produces inflated scores — it tends to rate its own answers as faithful and relevant even when they are not. Using a separate model (or a separate model family) produces more honest scores.

In production, consider using a model from a different provider as the judge for maximum independence.

---

## Lessons learned

**Metrics reveal which part of the pipeline to fix.** Low faithfulness points to the generator. Low precision points to the retriever. Low recall points to the corpus. Each metric has a different fix. Running all four on every eval case tells you exactly where to focus.

**Reference-free metrics are more practical.** Faithfulness, relevance, and precision require no ground truth — you can run them on live traffic at any time. Context recall requires manually written ground truth answers, which is expensive to maintain at scale. Start with the three reference-free metrics and add recall only for your most critical test cases.

**The grounding test is the most important single eval case.** A RAG system that fabricates answers to out-of-scope questions is dangerous in production. One adversarial case that asks something your docs can't answer immediately reveals whether your grounding instruction works. If faithfulness is below 0.90 on the grounding case, fix the system prompt before shipping.

**Eval quality compounds.** A well-calibrated eval suite from Phase 7 means every change in Phases 8–14 can be measured. When you introduce LangChain in Phase 11, you'll run the same evals and see whether the abstraction hurt or helped quality. When you switch to a different embedding model, evals tell you the impact immediately.

---

## Tech stack

* **Runtime:** Node.js 20+ (ES modules)
* **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai)
* **Judge model:** `gemini-2.5-flash-lite` — $0.10/M tokens, deterministic at temperature 0
* **Generator model:** `gemini-2.5-flash`
* **Vector DB:** PostgreSQL + pgvector (Phase 6 database)
* **Output format:** JSONL-compatible timestamped result files

---

## References

* [RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217)
* [Gemini native JSON mode](https://ai.google.dev/gemini-api/docs/structured-output)
* [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
* [LLM-as-judge pattern — Zheng et al. 2023](https://arxiv.org/abs/2306.05685)
