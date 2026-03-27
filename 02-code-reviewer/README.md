# Code Review Bot — AI-Powered Static Analysis via Gemini

> Phase 2 of a hands-on GenAI → Agentic AI learning roadmap. Built to understand prompt chaining, schema-first design, structured output validation, and treating LLM output as typed data your application depends on.

---

## What it does

Runs a thorough code review on any source file using a two-step LLM pipeline. Detects bugs, security vulnerabilities, performance issues, and maintainability problems — with a concrete fix suggestion for each issue.

**Run it:**

```bash
node index.js samples/bad.js
```

**Output:**

```
============================================================
CODE REVIEW REPORT
============================================================
Language : JavaScript
Score    : 15/100
Summary  : This code has critical security vulnerabilities and logic errors...

ISSUES (7 found)
------------------------------------------------------------

[CRITICAL]  Hardcoded Database Secret — line 1
  Type   : security
  Problem: Credentials in source code are committed to git history permanently...
  Fix    : Use process.env.DB_PASSWORD instead of hardcoding the value

[CRITICAL]  SQL Injection vulnerability — line 5
  Type   : security
  Problem: String concatenation in SQL queries allows attackers to manipulate...
  Fix    : Use parameterised queries: db.query("SELECT * FROM users WHERE id = ?", [id])

[HIGH]  Off-by-one error in loop — line 13
  Type   : bug
  Problem: Loop condition i <= items.length causes undefined access on last iteration...
  Fix    : Change <= to <
...
```

---

## Concepts covered

| Concept                           | Where it appears                                      |
| --------------------------------- | ----------------------------------------------------- |
| Prompt chaining (2-step pipeline) | `reviewer.js`— analysis call → formatting call    |
| Few-shot examples in prompt       | `prompts.js`— GOOD vs BAD entry examples           |
| Schema-first design               | `schema.js`— defined before any prompt was written |
| Output schema validation          | `validateReview()`in `schema.js`                  |
| Input validation before API call  | `validator.js`— file type, size, empty check       |
| Token estimation                  | `estimateTokens()`in `reviewer.js`                |
| Severity-ordered report rendering | `renderer.js`— critical issues always appear first |

---

## Project structure

```
code-reviewer/
├── .env                 # GEMINI_API_KEY (never commit this)
├── client.js            # GoogleGenAI initialisation (shared with Phase 1)
├── schema.js            # Output schema definition + validateReview()
├── validator.js         # Input validation — file type, size, empty check
├── prompts.js           # buildAnalysisPrompt() + buildFormattingPrompt()
├── reviewer.js          # Two-call pipeline: analyse → format → validate
├── renderer.js          # Structured JSON → terminal report
├── utils.js             # withRetry() — exponential backoff helper
├── index.js             # CLI entry point
└── samples/
    ├── good.js          # Clean code — verifies bot doesn't hallucinate issues
    └── bad.js           # Intentionally broken — SQL injection, secrets, off-by-one
```

---

## Setup

### Prerequisites

* Node.js 20+
* A free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Install

```bash
git clone <this-repo>
cd code-reviewer
npm install
```

### Configure

```bash
cp .env.example .env
# Add your key:
# GEMINI_API_KEY=your_key_here
```

### Run on the broken sample

```bash
node index.js samples/bad.js
```

### Run on the clean sample

```bash
node index.js samples/good.js
# Score should be 85+ with minimal issues
```

### Run on any file

```bash
node index.js /path/to/your/file.js
node index.js src/auth/middleware.ts
```

### Supported file types

`.js` `.ts` `.py` `.java` `.go` `.rs` `.cs` `.cpp` `.c` `.rb` `.php` `.swift`

---

## Architecture — the two-call chain

This is the most important design decision in the project. A single LLM call that simultaneously reasons about code quality AND produces valid JSON is inconsistent — the formatting constraint interferes with reasoning quality.

```
Input code
    │
    ▼
┌─────────────────────────────────────┐
│  Call 1 — Analysis pass             │
│  Free-form reasoning, no JSON       │
│  Model thinks without constraints   │
│  Output: plain text analysis        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Call 2 — Formatting pass           │
│  Input: analysis from Call 1        │
│  No new reasoning — structure only  │
│  Output: strict JSON per schema     │
└─────────────────┬───────────────────┘
                  │
                  ▼
         Schema validation
                  │
                  ▼
           Rendered report
```

**Why this works:** Call 1 gives the model full cognitive bandwidth to reason about what's wrong. Call 2 is a mechanical conversion task — the hard thinking is already done. Each call has one job and does it well.

**Where this pattern reappears:**

* Phase 3 (RAG): Call 1 = retrieve relevant context, Call 2 = generate grounded answer
* Phase 4 (Agents): Call 1 = plan which tools to use, Call 2 = execute the plan

---

## Schema-first design

The output schema in `schema.js` was written before any prompt code. This is intentional — defining the contract first forces clarity on what the system actually needs to produce.

```js
// schema.js — written first, before prompts.js
export const reviewSchema = {
  score: "number 0-100",
  language: "detected language string",
  summary: "2-3 sentence overall assessment",
  issues: [{
    id: "ISS-001 format",
    type: "bug | security | performance | style | maintainability",
    severity: "critical | high | medium | low | info",
    line: "number | null",
    title: "specific — what is wrong",
    detail: "why it is a problem",
    fix: "concrete code suggestion",
  }],
  positives: ["things done well"],
};
```

The prompt is then written to produce exactly this. The validator checks the LLM output against it at runtime. These three — schema, prompt, validator — always travel together.

---

## Input validation

The validator runs before any API call is made. This is important for two reasons: it saves tokens (and cost) on bad input, and it prevents confusing model behaviour caused by empty or oversized inputs.

```js
// validator.js — checks before the API is called
validateInput(code, filename)
// → { valid: true } or { valid: false, errors: ["Input too large..."] }
```

Limits enforced:

* Empty input: rejected
* Over 12,000 characters (~3,000 tokens): rejected with a clear message
* Unsupported file extension: rejected with the list of supported types

---

## Output validation

The validator runs after the JSON is parsed. LLMs occasionally drift from the schema — returning `"severity": "Major"` instead of `"severity": "high"`, or omitting required fields. Silent schema drift breaks downstream code.

```js
// schema.js
const { valid, errors } = validateReview(data);
if (!valid) {
  console.warn("Schema validation warnings:", errors);
  // Don't throw — partial output is still useful. Log and continue.
}
```

The decision not to throw on validation failure is deliberate: a review with a minor schema issue (one field slightly off) is still far more useful than no review at all.

---

## Key prompt engineering decisions

### Numbered rules over prose instructions

```
RULES:
1. ONE ENTRY PER COMMIT. Never merge...
2. TITLES must be specific and action-oriented...
3. DETAIL must add new information — never restate the title...
```

Prose instructions in a paragraph get partially ignored. Numbered, labelled rules are parsed more reliably.

### Explicit GOOD vs BAD examples

```
COMMIT:  "fix(auth): session not invalidated on password change"
BAD:     { "title": "Auth Session Fix", "detail": "Fixed auth session issue." }
GOOD:    { "title": "Session not invalidated on password change", "detail": "Users could remain logged in on other devices after a password change..." }
```

Telling the model "be specific" is weak. Showing it what specific looks like versus what bad looks like is significantly more effective.

### Separate analysis from formatting

The formatting prompt explicitly says: "Convert this analysis — no new reasoning needed." This anchors Call 2 to a mechanical task and prevents it from second-guessing the analysis from Call 1.

---

## What breaks in production (and how to fix it)

| Problem                                | Root cause                                     | Fix                                                        |
| -------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Schema validation warnings on severity | Model returns `"Major"`instead of `"high"` | Enum values repeated in prompt + few-shot example          |
| Issues merged into one entry           | Model collapses similar findings               | Rule: "one issue object per finding, never merge"          |
| Fix field says "refactor this"         | Prompt too vague                               | Rule: "fix must contain concrete code, not generic advice" |
| Hallucinated issues on clean code      | Model over-eager                               | Test on `good.js`regularly; score should be 85+          |
| Token limit hit on large files         | File over ~3000 tokens                         | `validator.js`caps at 12,000 chars; split large files    |

---

## Tech stack

* **Runtime:** Node.js 20+ (ES modules)
* **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai) — official Google Gen AI SDK
* **Model:** `gemini-2.5-flash` — fast, generous free tier
* **Deps:** `dotenv` for env management. No frameworks, no LangChain — raw SDK calls only.

---

## Why no LangChain or LlamaIndex?

At this stage of the learning roadmap, using a framework would hide the mechanics. The two-call chain here is 30 lines of code. Understanding what those 30 lines do is more valuable than having a framework abstract them. Frameworks are introduced in Phase 5 once the underlying patterns are fully understood.

---

## Learning context

This project is Phase 2 of a 5-phase GenAI learning roadmap:

| Phase                    | Project                                  | Concepts                                     |
| ------------------------ | ---------------------------------------- | -------------------------------------------- |
| 1 — LLM Basics          | Changelog generator                      | Prompting, structured output, streaming      |
| **2 — Prompting** | **Code review bot**← you are here | Prompt chaining, schema-first, validation    |
| 3 — RAG                 | Docs Q&A API                             | Embeddings, vector DB, retrieval pipeline    |
| 4 — Agents              | GitHub issue triage agent                | Tool calling, ReAct loop, planning           |
| 5 — Production          | Hardened AI API                          | Caching, evals, observability, cost tracking |

Built by a fullstack developer (Node.js / Express / Angular / healthcare systems) transitioning into AI engineering.

---

## References

* [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
* [Gemini API docs](https://ai.google.dev/gemini-api/docs)
* [Google AI Studio — get a free API key](https://aistudio.google.com/app/apikey)
* [Prompt engineering guide — Google](https://ai.google.dev/gemini-api/docs/prompting-strategies)
