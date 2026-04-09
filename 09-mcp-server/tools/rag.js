import { query } from "../db.js";
import { embedText } from "../rag/embedder.js"; // reuse from Phase 6

const MIN_SIMILARITY = 0.5;
const TOP_K = 5;

export async function searchDocs(searchQuery) {
    const embedding = await embedText(searchQuery);

    const result = await query(
        `SELECT
       source,
       content,
       context,
       1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     WHERE 1 - (embedding <=> $1::vector) > $2
     ORDER BY similarity DESC
     LIMIT $3`,
        [JSON.stringify(embedding), MIN_SIMILARITY, TOP_K]
    );

    if (!result.rows.length) {
        return { found: false, message: "No relevant documents found for this query." };
    }

    return {
        found: true,
        results: result.rows.map((r) => ({
            source: r.source,
            content: r.content,
            similarity: parseFloat(r.similarity.toFixed(3)),
        })),
    };
}