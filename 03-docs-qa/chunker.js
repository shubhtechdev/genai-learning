const CHUNK_SIZE = 500;      // characters per chunk (~125 tokens)
const CHUNK_OVERLAP = 100;   // characters of overlap between chunks

export function chunkText(text, source) {
    const chunks = [];
    // Split on paragraph boundaries first — respect natural document structure
    const paragraphs = text.split(/\n\n+/);

    let buffer = "";
    let chunkIndex = 0;

    for (const para of paragraphs) {
        const candidate = buffer ? buffer + "\n\n" + para : para;

        if (candidate.length <= CHUNK_SIZE) {
            buffer = candidate;
            continue;
        }

        // Buffer is full — flush it as a chunk
        if (buffer) {
            chunks.push({
                source,
                chunk_index: chunkIndex++,
                content: buffer.trim(),
            });
            // Keep overlap: last N chars of buffer become start of next chunk
            buffer = buffer.slice(-CHUNK_OVERLAP) + "\n\n" + para;
        } else {
            // Single paragraph larger than chunk size — split by sentences
            const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
            let sentBuf = "";
            for (const s of sentences) {
                if ((sentBuf + s).length > CHUNK_SIZE && sentBuf) {
                    chunks.push({
                        source,
                        chunk_index: chunkIndex++,
                        content: sentBuf.trim(),
                    });
                    sentBuf = sentBuf.slice(-CHUNK_OVERLAP) + s;
                } else {
                    sentBuf += s;
                }
            }
            buffer = sentBuf;
        }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
        chunks.push({
            source,
            chunk_index: chunkIndex++,
            content: buffer.trim(),
        });
    }

    return chunks;
}