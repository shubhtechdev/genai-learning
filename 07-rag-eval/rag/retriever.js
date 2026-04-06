import { embedText } from "./embedder.js";
import { query } from "../db.js";

const TOP_K = 5;              // retrieve top 5 most similar chunks
const MIN_SIMILARITY = 0.5;   // discard chunks below this score

export async function retrieve(question) {
    // 1. Embed the question using the SAME model used during ingestion
    const questionEmbedding = await embedText(question);

    // 2. Cosine similarity search via pgvector
    // 1 - (embedding <=> query_vector) converts distance to similarity score
    const result = await query(
        `SELECT
       id,
       source,
       chunk_index,
       content,
       1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     WHERE 1 - (embedding <=> $1::vector) > $2
     ORDER BY similarity DESC
     LIMIT $3`,
        [
            JSON.stringify(questionEmbedding),
            MIN_SIMILARITY,
            TOP_K,
        ]
    );

    return result.rows;   // [{id, source, content, similarity}, ...]
}