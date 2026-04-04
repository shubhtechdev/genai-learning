import { createShortTermMemory } from "./shortTerm.js";
import { storeMemory, recallMemories, getAllMemories } from "./longTerm.js";

export function createMemoryManager(userId = "default") {
    const shortTerm = createShortTermMemory();

    return {
        // Short-term operations
        addToConversation(role, content) {
            shortTerm.add(role, content);
        },

        getConversationHistory() {
            return shortTerm.getHistory();
        },

        // Long-term operations
        async remember(content, type = "fact", importance = 0.5) {
            const id = await storeMemory(userId, content, type, importance);
            console.log(`  [memory] stored: "${content.slice(0, 60)}..." (${type})`);
            return id;
        },

        async recall(question) {
            const memories = await recallMemories(userId, question);
            if (memories.length > 0) {
                console.log(`  [memory] recalled ${memories.length} relevant memories`);
            }
            return memories;
        },

        async getAllMemories() {
            return getAllMemories(userId);
        },

        // Format memories for injection into the prompt
        formatMemoriesForPrompt(memories) {
            if (!memories.length) return "";
            return memories
                .map((m) => `[${m.memory_type.toUpperCase()}] ${m.content}`)
                .join("\n");
        },
    };
}