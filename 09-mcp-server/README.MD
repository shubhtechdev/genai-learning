# Custom MCP Server — Model Context Protocol

> Phase 9 of a hands-on GenAI → Agentic AI learning roadmap. Exposes the Phase 6 RAG pipeline, Phase 6 agent memory, and Phase 4 GitHub tools as a standardised MCP server — connectable to Claude Desktop, Cursor, or any MCP-compatible client without writing agent code.

---

## What it does

An MCP (Model Context Protocol) server that wraps everything built in previous phases into a set of standardised tools any AI client can use. Once connected to Claude Desktop, you can ask questions like:

```
"Search my docs for information about contextual retrieval"
→ Claude calls search_docs tool → returns grounded answer from your Phase 6 RAG

"What do you remember about my learning preferences?"
→ Claude calls recall tool → returns memories from Phase 6 pgvector store

"Look up GitHub issue #4 and summarise it"
→ Claude calls get_github_issue tool → returns issue details from Phase 4 GitHub integration
```

No agent code required on the client side. Claude Desktop discovers your tools automatically via the MCP protocol.

---

## Concepts covered

| Concept                                   | Where it appears                                             |
| ----------------------------------------- | ------------------------------------------------------------ |
| MCP protocol — tools, resources, prompts | `server.js`— tools primitive implemented                  |
| MCP vs function calling distinction       | Architecture section below                                   |
| stdio transport                           | `index.js`— client launches server as child process       |
| Tool schema with Zod validation           | `server.js`— every tool has typed, validated parameters   |
| Tool descriptions as prompts              | `server.js`— AI reads descriptions to decide when to call |
| MCP Inspector for debugging               | Step 8 —`npx @modelcontextprotocol/inspector`             |
| Claude Desktop integration                | Step 7 —`claude_desktop_config.json`                      |
| Reusing Phase 4 + Phase 6 code            | `tools/`— zero duplication, same functions new interface  |

---

## Project structure

```
phase9-mcp-server/
├── .env                    # GEMINI_API_KEY, DATABASE_URL, GITHUB_TOKEN
├── client.js               # GoogleGenAI init
├── utils.js                # withRetry
├── db.js                   # Postgres pool
├── rag/
│   └── embedder.js         # gemini-embedding-001 (reused from Phase 6)
├── memory/
│   └── longTerm.js         # pgvector memory store (reused from Phase 6)
├── tools/
│   ├── rag.js              # search_docs — semantic search over Phase 6 docs
│   ├── memory.js           # remember, recall, list_memories
│   └── github.js           # get_github_issue, search_github_issues, post_comment, apply_labels
├── server.js               # MCP server — registers all 8 tools
└── index.js                # Entry point — stdio transport
```

---

## Setup

### Prerequisites

* Node.js 20+
* Phase 6 research assistant database running (docs ingested, memories table exists)
* Claude Desktop installed (for client testing): https://claude.ai/download
* GitHub PAT with Issues read/write (same as Phase 4)

### Install

```bash
git clone <this-repo>
cd phase9-mcp-server
npm install
cp .env.example .env
```

```
GEMINI_API_KEY=your_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/research_assistant
GITHUB_TOKEN=your_fine_grained_pat
GITHUB_OWNER=your_username
GITHUB_REPO=your_test_repo
```

### Test with MCP Inspector (before connecting a real client)

```bash
npx @modelcontextprotocol/inspector node index.js
# Opens http://localhost:5173 — call each tool manually, verify responses
```

### Connect to Claude Desktop

Find the config file:

* **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add your server:

```json
{
  "mcpServers": {
    "research-assistant": {
      "command": "node",
      "args": ["/absolute/path/to/phase9-mcp-server/index.js"],
      "env": {
        "GEMINI_API_KEY": "your_key_here",
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/research_assistant",
        "GITHUB_TOKEN": "your_pat_here",
        "GITHUB_OWNER": "your_username",
        "GITHUB_REPO": "your_test_repo"
      }
    }
  }
}
```

Restart Claude Desktop. A hammer icon (🔨) appears in the chat input when tools are available.

---

## The 8 tools exposed

| Tool                     | Description                                                   | Reuses              |
| ------------------------ | ------------------------------------------------------------- | ------------------- |
| `search_docs`          | Semantic search over Phase 6 RAG docs                         | Phase 6 retriever   |
| `remember`             | Store a fact/preference/conclusion/source to long-term memory | Phase 6 longTerm.js |
| `recall`               | Recall memories relevant to a question                        | Phase 6 longTerm.js |
| `list_memories`        | List all stored memories                                      | Phase 6 longTerm.js |
| `get_github_issue`     | Get full details of a GitHub issue                            | Phase 4 github.js   |
| `search_github_issues` | Search issues by keyword                                      | Phase 4 github.js   |
| `post_github_comment`  | Post a comment on an issue                                    | Phase 4 github.js   |
| `apply_github_labels`  | Apply labels to an issue                                      | Phase 4 github.js   |

---

## Architecture — MCP vs Phase 4 function calling

Both MCP tools and Phase 4 function calling let an AI model call external functions. The difference is coupling and reusability.

### Phase 4 function calling

```
Your agent code
    ├── tools.js          ← tool definitions (tightly coupled to this agent)
    ├── executor.js       ← execution logic
    └── agent.js          ← the agent that uses both

Problem: another agent needs these tools → copy-paste tools.js and executor.js
```

### MCP

```
MCP Server (separate process)
    └── server.js         ← tool definitions in standard format

Claude Desktop ──────────────→ MCP Server
Cursor        ──────────────→ MCP Server  (same server, different client)
Your agent    ──────────────→ MCP Server  (same server, different client)

Benefit: write the tools once, any MCP client discovers and uses them automatically
```

The stdio transport means the MCP client (Claude Desktop) launches your server as a child process and communicates via stdin/stdout. No HTTP server, no port management, no authentication layer — the OS handles process isolation.

---

## Tool descriptions are prompts

The description field on each tool is what the AI reads to decide whether and when to call it. This is identical to Phase 4's tool definitions, now in a standardised format.

**Weak description:**

```js
server.tool("search_docs", "Search documents", ...)
```

**Strong description:**

```js
server.tool(
  "search_docs",
  "Search the technical documentation using semantic similarity. Use this to answer questions about AI, RAG, embeddings, chunking, agent memory, and related topics. Returns the most relevant chunks with similarity scores.",
  ...
)
```

The strong version tells the model *when* to call it, *what topics* it covers, and  *what to expect back* . Poor descriptions produce tools that never get called or get called at the wrong time.

---

## MCP primitives (what you didn't build but should know)

Phase 9 implements **tools** only. The full MCP spec has three primitives:

**Tools** — functions the model can call. Bidirectional: model → server → model. What you built.

**Resources** — data the model can read. The model asks for a resource by URI, the server returns its content. Think of it as a filesystem the model can browse. Example: `resource://docs/contextual-retrieval.md` returns the file content. Good for large static context the model needs to read but not modify.

**Prompts** — reusable prompt templates the server exposes. A client asks "give me the code-review prompt", the server returns a pre-built prompt with optional dynamic slots. Good for standardising prompts across a team.

For most production use cases, tools cover 90% of what you need. Resources and prompts are useful for specific patterns — exposing a codebase to an AI editor (resources) or standardising prompts across a team (prompts).

---

## Key implementation decisions

### Zod for parameter validation

Every tool uses Zod schemas for parameter validation:

```js
{
  query:       z.string().describe("The question or topic to search for"),
  memory_type: z.enum(["fact", "preference", "conclusion", "source"]),
  importance:  z.number().min(0).max(1).optional(),
}
```

Zod validates inputs before your tool function runs — no need for manual type checking. Invalid arguments from the model are rejected with clear error messages before they reach your code.

### stdio transport over HTTP

stdio transport was chosen because it requires no network configuration, no port management, and no authentication setup. The MCP client manages the server process lifecycle — starts it on connection, kills it on disconnect.

HTTP/SSE transport is available when you need a persistent server accessible by multiple clients simultaneously or from remote machines. For local development and single-user tools, stdio is always the right choice.

### Reusing previous phases without duplication

All tool implementations import directly from Phase 6 (`memory/longTerm.js`, `rag/embedder.js`) and Phase 4 (`github.js`). No code was copied. The MCP server is a thin adapter layer — it translates MCP tool calls into calls to functions that already exist and work.

This is the correct architecture pattern: MCP server as interface, business logic in shared modules.

---

## Testing strategy

### Step 1 — Test tools in isolation first

```js
// Test rag.js directly before registering in server
import { searchDocs } from "./tools/rag.js";
const result = await searchDocs("contextual retrieval");
console.log(result);
```

Never debug an MCP tool through the full client → server → tool chain on first run. Test the tool function directly, then register it.

### Step 2 — Use MCP Inspector before Claude Desktop

```bash
npx @modelcontextprotocol/inspector node index.js
```

The Inspector gives you a web UI to call each tool manually, inspect request/response, and verify the server is working before connecting a real AI client. Skip this step and you'll spend an hour wondering why Claude isn't calling your tools — when the issue is actually a JSON parse error in the server startup.

### Step 3 — Check Claude Desktop logs

If Claude Desktop doesn't show the hammer icon after adding your server:

**Mac:**

```bash
tail -f ~/Library/Logs/Claude/mcp-server-research-assistant.log
```

**Windows:**

```
%APPDATA%\Claude\logs\mcp-server-research-assistant.log
```

The logs show exactly what error occurred during server startup. Usually it's a missing env variable or an import path issue.

---

## Lessons learned

**MCP makes tools reusable across clients without any extra work.** The same `search_docs` tool works in Claude Desktop, Cursor, and your own agent code. You write the logic once in the MCP server. The three clients discover it independently via the protocol. This is the most significant architectural improvement over Phase 4.

**Tool descriptions determine tool usage quality.** The model decides which tool to call and when based entirely on reading the description. A vague description means the tool gets ignored or called at the wrong time. Treat tool descriptions as prompts — be specific about when to use the tool, what it returns, and what topics it covers.

**stdio transport is simpler than it sounds.** No HTTP server, no routing, no auth. The client starts your process, pipes stdin/stdout, and the MCP SDK handles the protocol framing. Your code just registers tools and the SDK does everything else.

**The MCP Inspector is essential.** It's a free, official tool that saved significant debugging time. Always test with the Inspector before connecting a real client. It shows the exact JSON going over the wire, which makes protocol errors immediately obvious.

**Reusability compounds across phases.** The Phase 4 GitHub functions and Phase 6 RAG + memory functions required zero modification to expose as MCP tools. The only new code was the server registration layer. Building modular, well-separated code in earlier phases paid off here.

---

## Tech stack

* **Runtime:** Node.js 20+ (ES modules)
* **MCP SDK:** [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
* **Parameter validation:** `zod`
* **AI SDK:** [`@google/genai`](https://github.com/googleapis/js-genai) (for embeddings)
* **Vector DB:** PostgreSQL + pgvector (Phase 6 database)
* **GitHub API:** `@octokit/rest` (Phase 4)
* **MCP client tested with:** Claude Desktop

---


## References

* [Model Context Protocol specification](https://modelcontextprotocol.io/)
* [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
* [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
* [Claude Desktop MCP guide](https://modelcontextprotocol.io/quickstart/user)
* [Google Gen AI JS SDK](https://github.com/googleapis/js-genai)
