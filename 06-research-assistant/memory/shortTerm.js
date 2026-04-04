// Short-term memory is just an array — no DB, no embeddings
// It IS the conversation history you already built in Phase 4
// Formalising it here makes the unified memory interface clean

export function createShortTermMemory() {
    const messages = [];
    const MAX_MESSAGES = 20; // keep last 20 turns — beyond this, context gets too long

    return {
        add(role, content) {
            messages.push({ role, parts: [{ text: content }] });
            // Sliding window — drop oldest when limit hit
            if (messages.length > MAX_MESSAGES) {
                messages.splice(0, 2); // remove oldest user+model pair
            }
        },

        getHistory() {
            return [...messages]; // return a copy — never expose the internal array
        },

        getLastN(n) {
            return messages.slice(-n);
        },

        clear() {
            messages.length = 0;
        },

        get length() {
            return messages.length;
        },
    };
}