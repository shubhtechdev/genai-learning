export const toolDefinitions = [
    {
        name: "get_issue",
        description: "Get full details of a GitHub issue including title, body, current labels, and author. Call this first if you need to read the issue content.",
        parameters: {
            type: "object",
            properties: {
                issue_number: {
                    type: "number",
                    description: "The GitHub issue number to retrieve",
                },
            },
            required: ["issue_number"],
        },
    },
    {
        name: "search_issues",
        description: "Search for existing GitHub issues by keyword. Use this to find duplicates or related issues before triaging. Returns up to 5 results.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search keywords extracted from the issue title or body. Keep it concise — 3 to 5 words work best.",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "get_labels",
        description: "List all available labels in this repository. Always call this before applying labels so you only use labels that actually exist.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "apply_labels",
        description: "Apply one or more labels to the issue. Only use label names returned by get_labels.",
        parameters: {
            type: "object",
            properties: {
                issue_number: { type: "number", description: "The issue number to label" },
                labels: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of label names to apply. Must match existing repo labels exactly.",
                },
            },
            required: ["issue_number", "labels"],
        },
    },
    {
        name: "post_comment",
        description: "Post a comment on the issue. Use this to acknowledge the issue, ask for more info, or explain triage decisions to the author.",
        parameters: {
            type: "object",
            properties: {
                issue_number: { type: "number", description: "The issue number to comment on" },
                body: { type: "string", description: "The comment text. Be concise and helpful. Markdown is supported." },
            },
            required: ["issue_number", "body"],
        },
    },
    {
        name: "close_issue",
        description: "Close an issue. Only use this when a clear duplicate is found. Always post a comment explaining why before closing.",
        parameters: {
            type: "object",
            properties: {
                issue_number: { type: "number", description: "The issue number to close" },
                reason: {
                    type: "string",
                    enum: ["duplicate", "not_planned", "completed"],
                    description: "Reason for closing",
                },
            },
            required: ["issue_number"],
        },
    },
    {
        name: "finish_triage",
        description: "Call this when triage is complete. Summarise what actions were taken.",
        parameters: {
            type: "object",
            properties: {
                summary: {
                    type: "string",
                    description: "Brief summary of what was done: labels applied, duplicate found, comment posted, etc.",
                },
            },
            required: ["summary"],
        },
    },
];