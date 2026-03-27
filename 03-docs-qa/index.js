import { askQuestion } from "./query.js";
import { closePool } from "./db.js";

const question = process.argv.slice(2).join(" ");

if (!question) {
    console.error("Usage: node index.js <your question>");
    console.error('Example: node index.js "How do I use streaming with Gemini?"');
    process.exit(1);
}

const result = await askQuestion(question);

console.log("\n" + "=".repeat(60));
console.log("ANSWER");
console.log("=".repeat(60));
console.log(result.answer);
console.log("\nSources:", result.sources.join(", "));
console.log(`Chunks used: ${result.chunks_used} | Top similarity: ${result.top_similarity?.toFixed(3)}`);

await closePool();