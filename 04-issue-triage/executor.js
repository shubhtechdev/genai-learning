import * as github from "./github.js";

export async function executeTool(toolName, args) {
    console.log(`  → Executing: ${toolName}(${JSON.stringify(args)})`);
    if (toolName === "close_issue") {
        // In production: require a confidence score from the model before closing
        console.warn(`  DESTRUCTIVE ACTION: closing issue ${args.issue_number}`);
        // Could add: if (!args.confirmed) return { error: "Closing requires explicit confirmation" }
    }

    switch (toolName) {
        case "get_issue":
            return github.getIssue(args.issue_number);

        case "search_issues":
            return github.searchIssues(args.query);

        case "get_labels":
            return github.getLabels();

        case "apply_labels":
            return github.applyLabels(args.issue_number, args.labels);

        case "post_comment":
            return github.postComment(args.issue_number, args.body);

        case "close_issue":
            return github.closeIssue(args.issue_number, args.reason ?? "duplicate");

        case "finish_triage":
            return { done: true, summary: args.summary };

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}