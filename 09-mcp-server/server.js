import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchDocs } from "./tools/rag.js";
import { rememberFact, recallFacts, listAllMemories } from "./tools/memory.js";
import { getIssue, searchIssues, applyLabels, postComment } from "./tools/github.js";

export function createServer() {
    const server = new McpServer({
        name: "research-assistant",
        version: "1.0.0",
    });

    // ── Tool 1: Search your RAG docs ─────────────────────────────
    server.tool(
        "search_docs",
        "Search the technical documentation using semantic similarity. Use this to answer questions about AI, RAG, embeddings, chunking, agent memory, and related topics.",
        { query: z.string().describe("The question or topic to search for") },
        async ({ query }) => {
            const result = await searchDocs(query);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 2: Store a memory ───────────────────────────────────
    server.tool(
        "remember",
        "Store a fact, preference, conclusion, or useful source for later recall. Use this when you learn something important about the user or reach a meaningful conclusion.",
        {
            content: z.string().describe("The memory content to store"),
            memory_type: z.enum(["fact", "preference", "conclusion", "source"])
                .describe("Type of memory"),
            importance: z.number().min(0).max(1)
                .describe("Importance score 0.0-1.0 (conclusions=0.9, preferences=0.8, sources=0.6, facts=0.5)")
                .optional(),
        },
        async ({ content, memory_type, importance }) => {
            const result = await rememberFact(content, memory_type, importance ?? 0.5);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 3: Recall memories ──────────────────────────────────
    server.tool(
        "recall",
        "Recall stored memories relevant to a question or topic. Use this at the start of conversations to load relevant context from past sessions.",
        { question: z.string().describe("The question or topic to recall memories for") },
        async ({ question }) => {
            const result = await recallFacts(question);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 4: List all memories ────────────────────────────────
    server.tool(
        "list_memories",
        "List all stored memories. Use this when the user asks what you remember about them.",
        {},
        async () => {
            const result = await listAllMemories();
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 5: Get a GitHub issue ───────────────────────────────
    server.tool(
        "get_github_issue",
        "Get details of a specific GitHub issue by number.",
        { issue_number: z.number().describe("The GitHub issue number") },
        async ({ issue_number }) => {
            const result = await getIssue(issue_number);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 6: Search GitHub issues ─────────────────────────────
    server.tool(
        "search_github_issues",
        "Search GitHub issues by keyword. Use this to find duplicates or related issues.",
        { query: z.string().describe("Search keywords — 3 to 5 words work best") },
        async ({ query }) => {
            const result = await searchIssues(query);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 7: Post a GitHub comment ────────────────────────────
    server.tool(
        "post_github_comment",
        "Post a comment on a GitHub issue.",
        {
            issue_number: z.number().describe("The issue number to comment on"),
            body: z.string().describe("The comment text. Markdown supported."),
        },
        async ({ issue_number, body }) => {
            const result = await postComment(issue_number, body);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // ── Tool 8: Apply GitHub labels ──────────────────────────────
    server.tool(
        "apply_github_labels",
        "Apply labels to a GitHub issue.",
        {
            issue_number: z.number().describe("The issue number"),
            labels: z.array(z.string()).describe("Label names to apply"),
        },
        async ({ issue_number, labels }) => {
            const result = await applyLabels(issue_number, labels);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    return server;
}