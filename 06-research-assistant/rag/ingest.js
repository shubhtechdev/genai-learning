import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { contextualChunk } from "./chunker.js";
import { embedText } from "./embedder.js";
import { query, closePool } from "../db.js";

async function insertChunks(chunks) {
    for (const chunk of chunks) {
        const embedding = await embedText(chunk.embeddingText); // embed context + content

        await query(
            `INSERT INTO documents (source, chunk_index, content, context, embedding)
       VALUES ($1, $2, $3, $4, $5)`,
            [
                chunk.source,
                chunk.chunk_index,
                chunk.content,          // original — shown to user
                chunk.context,          // LLM-generated — stored for debugging
                JSON.stringify(embedding),
            ]
        );
    }
}

async function ingestFile(filepath) {
    const filename = filepath.split("/").pop();
    console.log(`\nIngesting: ${filename}`);

    const text = readFileSync(filepath, "utf8");

    // Clear existing chunks for this source (idempotent)
    await query("DELETE FROM documents WHERE source = $1", [filename]);

    const chunks = await contextualChunk(text, filename);
    await insertChunks(chunks);

    console.log(`  Stored ${chunks.length} contextual chunks`);
}

const DOCS_DIR = "./docs";
const files = readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(DOCS_DIR, f));

console.log(`Ingesting ${files.length} documents with contextual retrieval...`);
for (const f of files) await ingestFile(f);

const { rows } = await query("SELECT COUNT(*) FROM documents");
console.log(`\nDone. ${rows[0].count} total chunks in DB.`);
await closePool();