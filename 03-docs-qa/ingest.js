import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { chunkText } from "./chunker.js";
import { embedBatch } from "./embedder.js";
import { query, closePool } from "./db.js";

const DOCS_DIR = "./docs";

async function clearExistingDocs(source) {
    await query("DELETE FROM documents WHERE source = $1", [source]);
}

async function insertChunks(embeddedChunks) {
    for (const chunk of embeddedChunks) {
        await query(
            `INSERT INTO documents (source, chunk_index, content, embedding)
       VALUES ($1, $2, $3, $4)`,
            [
                chunk.source,
                chunk.chunk_index,
                chunk.content,
                JSON.stringify(chunk.embedding),  // pgvector accepts JSON array string
            ]
        );
    }
}

async function ingestFile(filepath) {
    const filename = filepath.split("/").pop();
    console.log(`\nIngesting: ${filename}`);

    const text = readFileSync(filepath, "utf8");
    const chunks = chunkText(text, filename);
    console.log(`  Chunked into ${chunks.length} pieces`);

    const embedded = await embedBatch(chunks);
    console.log(`  Embedded ${embedded.length} chunks`);

    await clearExistingDocs(filename);   // idempotent — safe to re-run
    await insertChunks(embedded);
    console.log(`  Stored in pgvector`);
}

async function ingestAll() {
    const files = readdirSync(DOCS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => join(DOCS_DIR, f));

    console.log(`Found ${files.length} documents to ingest`);

    for (const file of files) {
        await ingestFile(file);
    }

    const { rows } = await query("SELECT COUNT(*) FROM documents");
    console.log(`\nDone. Total chunks in DB: ${rows[0].count}`);

    await closePool();
}

ingestAll().catch(console.error);