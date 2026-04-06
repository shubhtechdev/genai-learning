import { ai } from "./client.js";
import { withRetry } from "./utils.js";

function buildRAGPrompt(question, chunks) {
    const context = chunks
        .map((c, i) => `[${i + 1}] Source: ${c.source} (similarity: ${c.similarity.toFixed(2)})\n${c.content}`)
        .join("\n\n---\n\n");

    return `Answer the question using ONLY the provided context below.

Rules:
- If the context does not contain enough information to answer, say "I don't have enough information in the docs to answer this." Do not guess.
- Always cite which source(s) your answer is based on using [1], [2] notation.
- Be concise and technical — the user is a developer.
- If the answer includes code, format it as a code block.

CONTEXT:
${context}

QUESTION: ${question}`;
}

export async function generateAnswer(question, chunks) {
    if (!chunks.length) {
        return {
            answer: "I don't have relevant documentation to answer this question.",
            sources: [],
        };
    }

    const response = await withRetry(() =>
        ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: buildRAGPrompt(question, chunks),
            config: {
                temperature: 0.1,    // very low — factual, grounded, no creativity
                maxOutputTokens: 1024,
            },
        })
    );

    // Extract unique sources cited
    const sources = [...new Set(chunks.map((c) => c.source))];

    return {
        answer: response.text,
        sources,
        chunks_used: chunks.length,
        top_similarity: chunks[0]?.similarity,
    };
}