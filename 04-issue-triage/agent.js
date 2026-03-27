import { ai } from "./client.js";
import { toolDefinitions } from "./tools.js";
import { executeTool } from "./executor.js";

const MAX_ITERATIONS = 10;   // hard cap — prevents infinite loops
const auditLog = [];

function buildSystemPrompt() {
    return `You are a GitHub issue triage agent. Your job is to triage new issues autonomously.

For every issue you must:
1. Read the issue using get_issue
2. Call get_labels to know what labels are available
3. Search for potential duplicates using search_issues with keywords from the title
4. Apply the most appropriate labels
5. Post a brief, helpful comment acknowledging the issue and explaining your triage
6. If a clear duplicate exists: post a comment linking to it, then close this issue
7. Call finish_triage when done

Rules:
- Always call get_labels before apply_labels — never guess label names
- Only close an issue as duplicate if you are highly confident — when in doubt, label it and leave it open
- Keep comments professional and concise — you are speaking as the repo's triage bot
- Never apply more than 3 labels at once
- If the issue is unclear, apply a needs-info label and ask a specific question in your comment`;
}

export async function triageIssue(issueNumber) {
    console.log(`\nTriaging issue #${issueNumber}...`);

    // Conversation history — this is the agent's memory for this session
    const messages = [
        {
            role: "user",
            parts: [{ text: `Please triage GitHub issue #${issueNumber}.` }],
        },
    ];

    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`\n[Iteration ${iterations}]`);

        // --- Ask the model what to do next ---
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: messages,
            config: {
                systemInstruction: buildSystemPrompt(),
                temperature: 0,      // agents should be deterministic — always use 0
                tools: [{ functionDeclarations: toolDefinitions }],
            },
        });

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];

        // --- Check what the model returned ---
        const toolCallPart = parts.find((p) => p.functionCall);
        const textPart = parts.find((p) => p.text);

        if (toolCallPart) {
            const { name, args } = toolCallPart.functionCall;
            console.log(`  Model wants to call: ${name}`);

            // --- Execute the tool ---
            const result = await executeTool(name, args);
            auditLog.push({
                iteration: iterations,
                tool: name,
                args,
                result,
                timestamp: new Date().toISOString(),
            });

            console.log(`  Result:`, JSON.stringify(result).slice(0, 120) + "...");

            // --- Append model's tool call + result to history ---
            messages.push({
                role: "model",
                parts: [{ functionCall: { name, args } }],
            });
            messages.push({
                role: "user",
                parts: [{
                    functionResponse: {
                        name,
                        response: { result },
                    },
                }],
            });

            // --- Check if agent signalled completion ---
            if (name === "finish_triage") {
                console.log(`\nTriage complete: ${result.summary}`);
                return { success: true, iterations, summary: result.summary, auditLog };
            }

        } else if (textPart) {
            // Model responded with text instead of a tool call — it's done reasoning
            console.log(`\nAgent final response: ${textPart.text}`);
            return { success: true, iterations, summary: textPart.text, auditLog };

        } else {
            console.warn("Unexpected response shape:", JSON.stringify(parts));
            break;
        }
    }

    return {
        success: false,
        error: `Hit iteration limit (${MAX_ITERATIONS}) without finishing`,
    };
}