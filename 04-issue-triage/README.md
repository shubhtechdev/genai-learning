# GitHub Issue Triage Agent — Agentic AI with Gemini Function Calling

> Phase 4 of a hands-on GenAI → Agentic AI learning roadmap. Built to understand the ReAct loop, function calling, tool executor pattern, and conversation history as agent memory.

---

## What it does

Triages GitHub issues autonomously. Given an issue number, the agent reads the issue, checks for duplicates, applies appropriate labels, posts a helpful comment, and closes duplicates — all without human input.

**Run it:**
```bash
node index.js 7
```

**A real triage run:**
```
Triaging issue #7...

[Iteration 1]
  Model wants to call: get_issue
  → Executing: get_issue({"issue_number":7})
  Result: {"title":"App crashes on login with special chars",...}

[Iteration 2]
  Model wants to call: get_labels
  → Executing: get_labels({})
  Result: [{"name":"bug"},{"name":"duplicate"},...]

[Iteration 3]
  Model wants to call: search_issues
  → Executing: search_issues({"query":"crash login special characters"})
  Result: [{"number":3,"title":"Login page crashes with @ symbol",...}]

[Iteration 4]
  Model wants to call: post_comment
  → Executing: post_comment({"issue_number":7,"body":"Thanks for the report! This appears to be a duplicate of #3..."})
  Result: {"success":true,"comment_id":123456}

[Iteration 5]
  Model wants to call: close_issue
  → Executing: close_issue({"issue_number":7,"reason":"duplicate"})
  DESTRUCTIVE ACTION: closing issue 7
  Result: {"success":true,"closed":7}

[Iteration 6]
  Model wants to call: finish_triage
  → Executing: finish_triage({"summary":"Closed #7 as duplicate of #3. Posted comment linking to original."})

Triage complete.
==================================================
Done in 6 iterations
```

---

## Concepts covered

| Concept | Where it appears |
|---|---|
| ReAct loop (Reason → Act → Observe) | `agent.js` — the core while loop |
| Function / tool calling | `tools.js` — tool schema definitions |
| Tool executor pattern | `executor.js` — decoupled execution layer |
| Conversation history as agent memory | `agent.js` — `messages[]` array |
| Iteration cap (circuit breaker) | `agent.js` — `MAX_ITERATIONS = 10` |
| Destructive action guardrail | `executor.js` — warning on `close_issue` |
| Temperature 0 for determinism | `agent.js` — agents must be reproducible |
| Audit log | `agent.js` — full trace of every tool call |

---

## Project structure

```
phase4-issue-triage/
├── .env                  # GEMINI_API_KEY + GITHUB_TOKEN + repo config
├── client.js             # GoogleGenAI init
├── utils.js              # withRetry() — exponential backoff
├── github.js             # GitHub API wrapper via @octokit/rest
├── tools.js              # Tool definitions — what the agent can call
├── executor.js           # Maps model tool decisions to real functions
├── agent.js              # ReAct loop — the agent brain
└── index.js              # CLI entry point
```

---

## Setup

### Prerequisites
- Node.js 20+
- GitHub account with a test repository
- GitHub Personal Access Token (fine-grained, Issues read/write)
- Free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Create a GitHub Personal Access Token

Go to: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → New token

Permissions needed (scoped to your test repo only):
- `Issues: Read and Write`

Never use a classic token with full repo scope for automated agents.

### Prepare your test repository

Create a repo with:
- 8–10 issues (mix of bugs, feature requests, questions)
- At least one obvious duplicate (reference another issue number in the body)
- Labels: `bug`, `feature`, `question`, `duplicate`, `needs-info`

### Install

```bash
git clone <this-repo>
cd phase4-issue-triage
npm install
```

### Configure

```bash
cp .env.example .env
```

```
GEMINI_API_KEY=your_key_here
GITHUB_TOKEN=your_fine_grained_pat
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_test_repo_name
```

### Run

```bash
node index.js <issue-number>
node index.js 4
```

---

## Architecture — the ReAct loop

This is the single most important concept in agent development. Understanding it means you understand every agent framework (LangChain, LlamaIndex, AutoGen) at the mechanical level.

```
You send:   [conversation history] + [tool definitions]
               │
               ▼
         Gemini decides:
         ┌─────────────────────────────────┐
         │  a) tool_call                   │
         │     { name, args }              │──→ You execute the real function
         │                                 │        │
         │                                 │        ▼
         │                                 │    Tool result appended
         │                                 │    to conversation history
         │                                 │        │
         │                                 │←───────┘
         │  b) text response               │
         │     → agent is done             │
         └─────────────────────────────────┘
```

**The model never calls GitHub.** It says "I want to call `search_issues` with `{query: 'crash login'}` ". You call GitHub. You tell the model what came back. It decides what to do next. This is the entire mechanism.

The `messages[]` array is the agent's working memory. Each iteration appends:
1. The model's tool call decision
2. Your tool execution result

The model always sees the full history — that's how it knows what it has already done.

---

## Tool design principles

Tool descriptions are prompts. The quality of your tool descriptions directly determines how well the agent reasons. Compare:

**Weak description:**
```js
{ name: "search_issues", description: "Search issues" }
```

**Strong description:**
```js
{
  name: "search_issues",
  description: "Search for existing GitHub issues by keyword. Use this to find duplicates or related issues before triaging. Returns up to 5 results with title, state, and labels.",
}
```

The strong version tells the model *when* to call the tool, *why* it exists, and *what to expect back*. This context drives better agent reasoning.

Three rules for good tool definitions:
1. Description explains when AND why to call it, not just what it does
2. Parameter descriptions include constraints (e.g. "3 to 5 words work best")
3. Enum values in parameter schemas eliminate hallucinated argument values

---

## Guardrails

Every agent needs guardrails. These are the three non-negotiable ones:

### 1. Iteration cap
```js
const MAX_ITERATIONS = 10;
```
Prevents infinite loops. Without this, a confused agent calling the same tool repeatedly will run until it hits rate limits or your API budget.

### 2. Destructive action logging
```js
if (toolName === "close_issue") {
  console.warn(`DESTRUCTIVE ACTION: closing issue ${args.issue_number}`);
}
```
Any action that cannot be undone gets logged loudly. In production this becomes a human-approval gate or a confidence threshold check.

### 3. Audit log
```js
auditLog.push({ iteration, tool: name, args, result, timestamp });
```
Every tool call, every argument, every result — logged with a timestamp. When an agent behaves unexpectedly, the audit log is the only way to understand why.

---

## Why `temperature: 0` for agents?

Agents make sequential decisions where each step depends on the last. Any randomness compounds across iterations — a slightly creative choice in iteration 2 can send the agent down a completely wrong path by iteration 6.

Temperature 0 gives you:
- Deterministic, reproducible behaviour
- The same issue triaged the same way every time
- Debuggable runs — you can reproduce any failure

Use temperature > 0 only for agents doing creative tasks (writing, brainstorming). For task automation, always use 0.

---

## The three agent failure modes

| Failure | Symptom | Fix |
|---|---|---|
| Infinite loop | Agent keeps calling the same tool | `MAX_ITERATIONS` circuit breaker |
| Hallucinated tool args | `apply_labels(["Bug", "Critical"])` when those labels don't exist | Force `get_labels` first in system prompt; validate args in executor |
| Premature finish | Agent calls `finish_triage` without posting a comment | Add checklist to system prompt: "you must have posted a comment before finishing" |

---

## Smart agent behaviour observed in practice

The agent skips `search_issues` when the issue body already contains a reference to another issue (e.g. "Same as #1"). This is the model reasoning from context — not explicit logic in the code. It reads the issue content, sees the reference, and correctly infers a search is redundant.

This is why agents beat hardcoded automation scripts for complex triage: they adapt to what's in front of them.

---

## Tech stack

- **Runtime:** Node.js 20+ (ES modules)
- **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai)
- **Model:** `gemini-2.5-flash` (temperature 0)
- **GitHub API:** [`@octokit/rest`](https://github.com/octokit/rest.js)
- **No agent framework** — raw SDK only, intentional for learning

---

## Why no LangChain?

At this stage the ReAct loop is ~40 lines of code. Understanding those 40 lines is more valuable than having a framework abstract them. When you reach Phase 5 and use LangChain for production infrastructure, you'll understand exactly what it's doing under the hood.

Frameworks are introduced when they earn their place — when the boilerplate they eliminate is larger than the abstraction cost they add.

---

## Learning context

This project is Phase 4 of a 5-phase GenAI learning roadmap. See the [root README](../README.md) for the full picture.

| Phase | Project | Key concept |
|---|---|---|
| 1 | Changelog generator | LLM basics, prompting |
| 2 | Code review bot | Prompt chaining, structured output |
| 3 | Docs Q&A (RAG) | Embeddings, vector search, grounding |
| **4** | **GitHub triage agent** ← | **ReAct loop, function calling, agents** |
| 5 | Production hardening | Caching, evals, observability |

---

## References

- [Gemini Function Calling docs](https://ai.google.dev/gemini-api/docs/function-calling)
- [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
- [Octokit REST.js](https://octokit.github.io/rest.js/)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) — the original paper
