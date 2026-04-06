// compare.js — revised: zero-shot vs few-shot only
import { ai } from "./client.js";
import { withRetry } from "./utils.js";

const TEST_COMMITS = `feat(onboarding): add interactive product tour for new users
fix(billing): prorated credits not applied on plan downgrade
fix(api): rate limit headers missing from error responses
perf(images): lazy load below-fold images on dashboard
refactor(logger): replace console.log with structured winston logger
docs: add architecture decision record for message queue choice`;

const SYSTEM_PROMPT = `You are a technical changelog generator.
Transform raw git commits into a structured changelog.
Format: ## Category\n- **Title**: Detail sentence. _(severity for bugs)_
Categories: Features, Bug Fixes, Performance, Refactoring, Documentation
One entry per commit. Titles specific. Details explain user impact.`;

const FEW_SHOT_EXAMPLES = `
INPUT:
feat(auth): add biometric login support
fix(sync): data corruption on concurrent writes

OUTPUT:
## Features
- **Biometric login support**: Users can now authenticate using Face ID or fingerprint on supported devices. Falls back to PIN if biometrics unavailable.

## Bug Fixes
- **Data corruption on concurrent writes** _(high)_: Race condition in the sync engine caused data loss when two devices wrote simultaneously. Fixed with optimistic locking.

---

INPUT:
perf(api): add response compression
docs: update deployment guide for k8s

OUTPUT:
## Performance
- **API response compression**: Gzip enabled for responses over 1KB. Reduces payload size by 65%, improving load times on slow connections.

## Documentation
- **Kubernetes deployment guide**: Updated with Helm chart config, resource limits, and health check setup.`;

async function generate(approach, commits) {
    const start = Date.now();

    const contents = approach === "zero-shot"
        ? `Generate a changelog for these commits:\n\n${commits}`
        : `Generate a changelog for these commits.\n\nExamples:\n${FEW_SHOT_EXAMPLES}\n\nNow generate for:\n${commits}`;

    const response = await withRetry(() =>
        ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.2,
                maxOutputTokens: 1024,
            },
        })
    );

    return {
        approach,
        output: response.text,
        latency_ms: Date.now() - start,
        input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
}

async function measureConsistency(approach, runs = 3) {
    const outputs = [];
    for (let i = 0; i < runs; i++) {
        const r = await generate(approach, TEST_COMMITS);
        outputs.push(r.output);
        await new Promise(res => setTimeout(res, 3000));
    }
    // Check if section headers are identical across runs
    const headers = outputs.map(o =>
        [...o.matchAll(/^## .+/gm)].map(m => m[0]).sort().join("|")
    );
    const consistent = headers.every(h => h === headers[0]);
    return { consistent, runs: outputs.length };
}

console.log("=".repeat(60));
console.log("HEAD-TO-HEAD: Zero-shot vs Few-shot");
console.log("=".repeat(60));

for (const approach of ["zero-shot", "few-shot"]) {
    console.log(`\n[${approach.toUpperCase()}]`);
    const result = await generate(approach, TEST_COMMITS);

    console.log(`Input tokens  : ${result.input_tokens}`);
    console.log(`Output tokens : ${result.output_tokens}`);
    console.log(`Latency       : ${result.latency_ms}ms`);
    console.log(`\nOutput:\n${result.output}`);
    console.log("─".repeat(60));

    await new Promise(r => setTimeout(r, 4000));
}

// Consistency test — run same input 3 times, check reproducibility
console.log("\nConsistency test (3 runs each)...");
for (const approach of ["zero-shot", "few-shot"]) {
    const c = await measureConsistency(approach);
    console.log(`${approach}: ${c.consistent ? "CONSISTENT" : "INCONSISTENT"} across ${c.runs} runs`);
    await new Promise(r => setTimeout(r, 5000));
}