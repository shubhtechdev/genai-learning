import { retrieve } from "./retriever.js";
import { generateAnswer } from "./generator.js";

export async function askQuestion(question) {
    console.log(`\nSearching docs for: "${question}"`);

    // Step 1: Retrieve relevant chunks
    const chunks = await retrieve(question);
    console.log(`Found ${chunks.length} relevant chunks (top similarity: ${chunks[0]?.similarity?.toFixed(3) ?? "none"})`);

    if (!chunks.length) {
        console.log("No relevant chunks found above similarity threshold.");
    }

    // Step 2: Generate grounded answer
    const result = await generateAnswer(question, chunks);

    return result;
}