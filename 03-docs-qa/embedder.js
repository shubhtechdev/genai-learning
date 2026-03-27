import { ai } from "./client.js";
import { withRetry } from "./utils.js";

const EMBEDDING_MODEL = "gemini-embedding-001";
const BATCH_SIZE = 20;     // embed 20 chunks per API call — stay under rate limits

export async function embedText(text) {
    const response = await withRetry(() =>
        ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text,         // single string
            config: {
                outputDimensionality: 1536,    // was 3072 — now safely under 2000
            },
        })
    );
    return response.embeddings[0].values;   // array of 1536 floats
}

export async function embedBatch(chunks) {
    const results = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        console.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);

        // Embed each chunk in the batch (parallel within batch)
        const embeddings = await Promise.all(
            batch.map((chunk) => embedText(chunk.content))
        );

        results.push(
            ...batch.map((chunk, j) => ({
                ...chunk,
                embedding: embeddings[j],
            }))
        );

        // Brief pause between batches — respect rate limits
        if (i + BATCH_SIZE < chunks.length) {
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    return results;
}