import { query } from "../db.js";
import { embedText } from "../rag/embedder.js";
import { withRetry } from "../utils.js";

const RECALL_THRESHOLD = 0.55;  // lower than RAG (0.5) — memories are personal context
const RECALL_TOP_K = 5;

export async function storeMemory(userId = "default", content, memoryType = "fact", importance = 0.5) {
    const embedding = await embedText(content);

    const result = await query(
        `INSERT INTO memories (user_id, content, memory_type, embedding, importance)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
        [userId, content, memoryType, JSON.stringify(embedding), importance]
    );

    return result.rows[0].id;
}

export async function recallMemories(userId = "default", currentQuestion) {
    // Embed the current question to find semantically relevant memories
    const questionEmbedding = await embedText(currentQuestion);

    const result = await query(
        `SELECT
       id,
       content,
       memory_type,
       importance,
       access_count,
       created_at,
       1 - (embedding <=> $1::vector) AS similarity
     FROM memories
     WHERE user_id = $2
       AND 1 - (embedding <=> $1::vector) > $3
     ORDER BY
       -- Rank by similarity * importance — important memories surface first
       (1 - (embedding <=> $1::vector)) * importance DESC
     LIMIT $4`,
        [JSON.stringify(questionEmbedding), userId, RECALL_THRESHOLD, RECALL_TOP_K]
    );

    // Update access stats for recalled memories
    if (result.rows.length > 0) {
        const ids = result.rows.map((r) => r.id);
        await query(
            `UPDATE memories
       SET access_count = access_count + 1,
           last_accessed = NOW()
       WHERE id = ANY($1)`,
            [ids]
        );
    }

    return result.rows;
}

export async function getAllMemories(userId = "default") {
    const result = await query(
        `SELECT id, content, memory_type, importance, access_count, created_at
     FROM memories
     WHERE user_id = $1
     ORDER BY importance DESC, last_accessed DESC
     LIMIT 50`,
        [userId]
    );
    return result.rows;
}

export async function forgetMemory(memoryId) {
    await query("DELETE FROM memories WHERE id = $1", [memoryId]);
}