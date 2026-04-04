import readline from "readline";
import { createAssistant } from "./agent/assistant.js";
import { closePool } from "./db.js";

const userId = process.argv[2] ?? "default";
console.log(`Research Assistant — session for user: ${userId}`);
console.log('Commands: "memories" to see stored memories, "exit" to quit\n');

const assistant = await createAssistant(userId);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function prompt() {
    rl.question("You: ", async (input) => {
        const trimmed = input.trim();
        if (!trimmed) return prompt();

        if (trimmed.toLowerCase() === "exit") {
            console.log("Session ended. Memories saved.");
            rl.close();
            await closePool();
            return;
        }

        if (trimmed.toLowerCase() === "memories") {
            await assistant.showMemories();
            return prompt();
        }

        try {
            const response = await assistant.chat(trimmed);
            console.log(`\nAssistant: ${response}\n`);
        } catch (err) {
            console.error("Error:", err.message);
        }

        prompt();
    });
}

prompt();