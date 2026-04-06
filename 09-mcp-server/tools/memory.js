import { storeMemory, recallMemories, getAllMemories } from "../memory/longTerm.js"; // reuse Phase 6

export async function rememberFact(content, memoryType = "fact", importance = 0.5) {
    const id = await storeMemory("mcp-user", content, memoryType, importance);
    return { stored: true, id, content, type: memoryType };
}

export async function recallFacts(question) {
    const memories = await recallMemories("mcp-user", question);
    if (!memories.length) {
        return { found: false, message: "No relevant memories found." };
    }
    return {
        found: true,
        memories: memories.map((m) => ({
            content: m.content,
            type: m.memory_type,
            importance: m.importance,
            similarity: parseFloat((m.similarity ?? 0).toFixed(3)),
        })),
    };
}

export async function listAllMemories() {
    const memories = await getAllMemories("mcp-user");
    return { count: memories.length, memories };
}