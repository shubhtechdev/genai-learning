import { ai } from "../client.js";
import { withRetry } from "../utils.js";

const EMBEDDING_MODEL = "gemini-embedding-001";

export async function embedText(text) {
    const response = await withRetry(() =>
        ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text,
            config: { outputDimensionality: 1536 },
        })
    );
    return response.embeddings[0].values;
}