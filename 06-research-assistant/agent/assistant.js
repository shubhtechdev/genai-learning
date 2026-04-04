import { ai } from "../client.js";
import { createMemoryManager } from "../memory/manager.js";
import { buildSystemPrompt } from "./prompts.js";
import { retrieve as recallDocs } from "../rag/retriever.js";
import { withRetry } from "../utils.js";

const MEMORY_PATTERN = /\[REMEMBER:\s*(fact|preference|conclusion|source):\s*([^\]]+)\]/gi;

// Importance scores by memory type
const IMPORTANCE = {
    conclusion: 0.9,   // high — explicitly reached conclusion
    preference: 0.8,   // high — shapes future behaviour
    source: 0.6,   // medium — useful reference
    fact: 0.5,   // medium — general information
};

export async function createAssistant(userId = "default") {
    const memory = createMemoryManager(userId);

    async function chat(userMessage) {
        console.log("\n[Thinking...]");

        // 1. Recall relevant long-term memories
        const longTermMemories = await memory.recall(userMessage);

        // 2. Retrieve relevant document chunks (RAG)
        const docChunks = await recallDocs(userMessage);
        const docContext = docChunks.length
            ? docChunks
                .map((c, i) => `[${i + 1}] ${c.content}\n[source: ${c.source}]`)
                .join("\n\n---\n\n")
            : "No relevant documentation found.";

        // 3. Build the full message with context
        const contextualMessage = `${userMessage}

${docChunks.length ? `Relevant documentation:\n${docContext}` : ""}`;

        // 4. Add user message to short-term memory
        memory.addToConversation("user", contextualMessage);

        // 5. Generate response using full context
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: memory.getConversationHistory(),
                config: {
                    systemInstruction: buildSystemPrompt(
                        longTermMemories,
                        new Date().toLocaleDateString("en-IN", { dateStyle: "full" })
                    ),
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                },
            })
        );

        const assistantText = response.text;

        // 6. Add response to short-term memory
        memory.addToConversation("model", assistantText);

        // 7. Extract and store memory signals from the response
        const memoryMatches = [...assistantText.matchAll(MEMORY_PATTERN)];
        for (const match of memoryMatches) {
            const [, type, content] = match;
            await memory.remember(
                content.trim(),
                type.toLowerCase(),
                IMPORTANCE[type.toLowerCase()] ?? 0.5
            );
        }

        // 8. Return clean response (strip memory signals from display)
        return assistantText.replace(MEMORY_PATTERN, "").trim();
    }

    async function showMemories() {
        const all = await memory.getAllMemories();
        if (!all.length) {
            console.log("No memories stored yet.");
            return;
        }
        console.log(`\nStored memories (${all.length}):`);
        all.forEach((m) => {
            console.log(`  [${m.memory_type}] ${m.content}`);
            console.log(`    importance: ${m.importance} | accessed: ${m.access_count}x`);
        });
    }

    return { chat, showMemories };
}