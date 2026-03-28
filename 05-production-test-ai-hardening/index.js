import { hardenedQuery } from "./pipeline.js";
import { runEvals } from "./evals/runner.js";
import { closeCache } from "./cache.js";
import { closePool } from "./phase-3-code/db.js";

const command = process.argv[2];

if (command === "eval") {
    // Run eval suite: node index.js eval
    const verbose = process.argv.includes("--verbose");
    const version = process.argv[3];   // node index.js eval v1.1
    const results = await runEvals({ promptVersion: version, verbose });
    if (results.pct < 80) {
        console.error("\nEval threshold not met (80%). Do not deploy this prompt version.");
        process.exit(1);
    }

} else {
    // Ask a question: node index.js "How do I use streaming?"
    const question = process.argv.slice(2).join(" ");
    if (!question) {
        console.error('Usage: node index.js "your question"');
        console.error("       node index.js eval [version] [--verbose]");
        process.exit(1);
    }

    const result = await hardenedQuery(question);

    console.log("\n" + "=".repeat(60));
    console.log(result.answer);
    console.log("\nSources :", result.sources.join(", ") || "none");
    console.log("Model   :", result.model);
    console.log("Version :", result.prompt_version);
    console.log("Cache   :", result.cache_hit ? `HIT (${result.similarity?.toFixed(3)})` : "MISS");
    console.log("Tokens  :", result.tokens ?? "n/a");
    console.log("Cost    :", result.cost_usd != null ? `$${result.cost_usd.toFixed(6)}` : "n/a");
}

await closeCache();
await closePool();