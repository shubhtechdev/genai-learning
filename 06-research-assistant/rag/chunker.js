import { ai } from "../client.js";
import { withRetry } from "../utils.js";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

// Generate a 1-2 sentence context for each chunk
// This is the core of Anthropic's contextual retrieval technique
async function generateChunkContext(fullDocument, chunk, source) {
    const response = await withRetry(() =>
        ai.models.generateContent({
            model: "gemini-2.5-flash-lite", // cheap model — this runs once per chunk at ingest
            contents: `Here is a document:
<document>
${fullDocument.slice(0, 8000)} 
</document>

Here is a specific chunk from that document:
<chunk>
${chunk}
</chunk>

In 1-2 concise sentences, describe what this chunk is about and where it fits in the document. 
This context will be prepended to the chunk to improve search retrieval.
Output only the context sentences, nothing else.`,
            config: { temperature: 0, maxOutputTokens: 150 },
        })
    );
    return response.text.trim();
}

// Basic paragraph chunker (same logic as Phase 3)
function splitIntoChunks(text, source) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let buffer = "";
    let chunkIndex = 0;

    for (const para of paragraphs) {
        const candidate = buffer ? buffer + "\n\n" + para : para;
        if (candidate.length <= CHUNK_SIZE) {
            buffer = candidate;
            continue;
        }
        if (buffer) {
            chunks.push({ source, chunk_index: chunkIndex++, content: buffer.trim() });
            buffer = buffer.slice(-CHUNK_OVERLAP) + "\n\n" + para;
        } else {
            chunks.push({ source, chunk_index: chunkIndex++, content: para.trim() });
            buffer = "";
        }
    }
    if (buffer.trim()) {
        chunks.push({ source, chunk_index: chunkIndex++, content: buffer.trim() });
    }
    return chunks;
}

// Contextual chunking — adds LLM context to each chunk
export async function contextualChunk(text, source) {
    const rawChunks = splitIntoChunks(text, source);
    console.log(`  Generating context for ${rawChunks.length} chunks...`);

    const contextualChunks = [];

    for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        process.stdout.write(`    Chunk ${i + 1}/${rawChunks.length}... `);

        const context = await generateChunkContext(text, chunk.content, source);

        // The embedded text = context + original chunk
        // The stored content = original chunk (what you show to the user)
        contextualChunks.push({
            ...chunk,
            context,                                      // stored separately
            embeddingText: `${context}\n\n${chunk.content}`, // what gets embedded
        });

        console.log("done");

        // Pause between chunks — flash-lite still has rate limits
        if (i < rawChunks.length - 1) {
            await new Promise((r) => setTimeout(r, 300));
        }
    }

    return contextualChunks;
}