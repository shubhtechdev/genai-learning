
# Changelog Generator — AI-Powered Release Notes from Git Commits

> Phase 1 of a hands-on GenAI → Agentic AI learning roadmap. Built to understand LLM basics: prompt anatomy, structured output, streaming, and defensive parsing.

---

## What it does

Takes raw `git log` output and transforms it into a structured, human-readable changelog using Gemini 2.5 Flash. Output is both JSON (machine-readable) and Markdown (human-readable).

**Input — raw git commits:**

```
feat(auth): add JWT refresh token support
fix(db): connection pool exhaustion under high load
perf(search): add index on user_id column, 3x query speedup
```

**Output — structured changelog:**

```markdown
## Features
- **JWT refresh token support**: Users can now stay logged in across sessions...

## Bug Fixes
- **Connection pool exhaustion under high load** _(high)_: The database connection...

## Performance
- **Search query speed improved 3x**: Added index on user_id column...
```

---

## Concepts covered

| Concept                        | Where it appears                                              |
| ------------------------------ | ------------------------------------------------------------- |
| Prompt anatomy (system / user) | `prompts.js`                                                |
| Few-shot examples in prompt    | `prompts.js`— good vs bad example                          |
| Structured JSON output         | System prompt schema definition                               |
| Defensive output parsing       | `parser.js`— strip fences, try/catch, truncation detection |
| Streaming responses            | `generateChangelogStreamed()`in `index.js`                |
| Retry with exponential backoff | `utils.js`— handles 429 and 503                            |
| Dynamic value injection        | `buildUserPrompt()`— injects today's date                  |

---

## Project structure

```
changelog-gen/
├── .env                 # GEMINI_API_KEY (never commit this)
├── client.js            # GoogleGenAI initialisation
├── commits.js           # Sample hardcoded commits for testing
├── git.js               # Real git log extraction via child_process
├── prompts.js           # System + user prompt builders
├── parser.js            # Defensive JSON parser with truncation detection
├── renderer.js          # JSON → Markdown renderer
├── utils.js             # withRetry() — exponential backoff helper
└── index.js             # Entry point — wires everything together
```

---

## Setup

### Prerequisites

* Node.js 20+
* A free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Install

```bash
git clone <this-repo>
cd changelog-gen
npm install
```

### Configure

```bash
cp .env.example .env
# Add your key:
# GEMINI_API_KEY=your_key_here
```

### Run on sample data

```bash
node index.js
```

### Run on a real git repository

```js
// Edit index.js — replace sampleCommits with:
import { getCommits } from "./git.js";
const commits = getCommits("/path/to/your/project", 40);
```

```bash
node index.js
# Output written to CHANGELOG.md
```

---

## Key implementation decisions

### Why two output formats?

JSON is consumed by CI/CD pipelines and tooling. Markdown is read by humans. The same data, rendered twice, costs nothing and covers both use cases.

### Why the two-step prompt (analysis instructions + schema)?

Early versions asked the model to simultaneously understand what changed AND format it as JSON. Output quality was inconsistent. Separating the semantic rules (what to include, how to classify) from the structural rules (the JSON schema) made output significantly more reliable.

### Why inject the date into the user prompt?

The model cannot know the current date — it's a frozen snapshot of training data. Any dynamic value (dates, version numbers, usernames) must be injected explicitly. Relying on the model to "know" it results in hallucinated values like `2023-10-27`.

### Why detect truncation separately from JSON.parse errors?

`JSON.parse` throws a generic `SyntaxError` for both truncated responses and malformed JSON. These have different root causes and different fixes: truncation = raise `maxOutputTokens`, malformed = fix the prompt. The brace count check surfaces the real problem immediately.

---

## Prompt engineering lessons learned

1. **Number your rules.** Prose instructions get partially ignored. Numbered, labelled rules are followed consistently.
2. **Show a bad example alongside a good one.** `GOOD: { "title": "Session not invalidated..." }` vs `BAD: { "title": "Auth fix" }` is more effective than writing "be specific".
3. **Add a `removed` category.** Without it, commits like `remove NLP functionality` get classified as features. Categories should cover the full range of what a commit can represent.
4. **Tell the model what not to do.** `"Skip low-value chore commits"` significantly reduced noise in output.

---

## What breaks in production (and how to fix it)

| Problem                              | Root cause                                       | Fix                                                        |
| ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| `Parse failed: Truncated response` | `maxOutputTokens`too low for large commit sets | Raise to `8192`, cap commits at 80                       |
| Wrong date in output                 | Model hallucinating from training data           | Inject `new Date().toISOString().slice(0,10)`into prompt |
| Removals listed as features          | No `removed`category in schema                 | Add category + rule in system prompt                       |
| All bug fixes merged into one entry  | Model collapsing similar commits                 | Add rule: "one entry per commit, never merge"              |

---

## Tech stack

* **Runtime:** Node.js 20+ (ES modules)
* **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai) — official Google Gen AI SDK
* **Model:** `gemini-2.5-flash` — fast, generous free tier, 1M token context window
* **Deps:** `dotenv` for env management

---

## Learning context

This project is Phase 1 of a 5-phase GenAI learning roadmap:

| Phase                     | Project                                      | Concepts                                     |
| ------------------------- | -------------------------------------------- | -------------------------------------------- |
| **1 — LLM Basics** | **Changelog generator**← you are here | Prompting, structured output, streaming      |
| 2 — Prompting            | Code review bot                              | Prompt chaining, few-shot, validation        |
| 3 — RAG                  | Docs Q&A API                                 | Embeddings, vector DB, retrieval pipeline    |
| 4 — Agents               | GitHub issue triage agent                    | Tool calling, ReAct loop, planning           |
| 5 — Production           | Hardened AI API                              | Caching, evals, observability, cost tracking |

Built by a fullstack developer (Node.js / Express / Angular / healthcare systems) transitioning into AI engineering.

---

## References

* [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
* [Gemini API docs](https://ai.google.dev/gemini-api/docs)
* [Google AI Studio — get a free API key](https://aistudio.google.com/app/apikey)
* [Gemini model list](https://ai.google.dev/gemini-api/docs/models)
