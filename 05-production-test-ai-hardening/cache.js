// import { createClient } from "redis";  // ioredis alternative shown below
import { ai } from "./client.js";

// Use ioredis (what we installed):
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const EMBEDDING_MODEL = "gemini-embedding-001";
const SIMILARITY_THRESHOLD = 0.92;  // high threshold — only cache near-identical queries
const TTL_SECONDS = 60 * 60 * 24;   // 24 hour cache TTL

async function embedQuery(text) {
    const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { outputDimensionality: 1536 },
    });
    return response.embeddings[0].values;
}

function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function getCachedResponse(question) {
    // Embed the incoming question
    const queryEmbedding = await embedQuery(question);

    // Scan recent cache entries and find the most similar
    // In production: use Redis vector search (RediSearch) for scale
    const keys = await redis.keys("cache:*");
    let bestMatch = null;
    let bestScore = 0;

    for (const key of keys) {
        const raw = await redis.get(key);
        if (!raw) continue;

        const entry = JSON.parse(raw);
        const score = cosineSimilarity(queryEmbedding, entry.embedding);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = { ...entry, score };
        }
    }

    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
        return {
            hit: true,
            answer: bestMatch.answer,
            similarity: bestScore,
            original_question: bestMatch.question,
        };
    }

    return { hit: false, embedding: queryEmbedding };
}

export async function setCachedResponse(question, embedding, answer) {
    const key = `cache:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const entry = { question, embedding, answer, cached_at: new Date().toISOString() };

    await redis.set(key, JSON.stringify(entry), "EX", TTL_SECONDS);
    return key;
}

export async function closeCache() {
    await redis.quit();
}