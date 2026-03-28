import { askQuestion } from "../phase-3-code/query.js";  // reuse Phase 3 query pipeline
import { evalCases } from "./cases.js";
import { getPrompt } from "../promptRegistry.js";
import { writeFileSync } from "fs";


function scoreAnswer(answer, evalCase) {
    const lower = answer.toLowerCase();
    const results = { passed: true, failures: [] };

    // Check required keywords
    for (const keyword of evalCase.must_contain) {
        if (!lower.includes(keyword.toLowerCase())) {
            results.passed = false;
            results.failures.push(`Missing required: "${keyword}"`);
        }
    }

    // Check forbidden keywords
    for (const keyword of evalCase.must_not_contain) {
        if (lower.includes(keyword.toLowerCase())) {
            results.passed = false;
            results.failures.push(`Contains forbidden: "${keyword}"`);
        }
    }

    // Check minimum length
    if (answer.length < evalCase.min_length) {
        results.passed = false;
        results.failures.push(
            `Answer too short: ${answer.length} chars (min ${evalCase.min_length})`
        );
    }

    return results;
}

export async function runEvals(options = {}) {
    const { promptVersion = null, verbose = false } = options;
    const { version: activeVersion } = getPrompt("rag_system", promptVersion);

    console.log(`\nRunning ${evalCases.length} evals against prompt version: ${activeVersion}`);
    console.log("=".repeat(60));

    const results = [];
    let passed = 0;

    for (const evalCase of evalCases) {
        process.stdout.write(`  ${evalCase.id} (${evalCase.category})... `);

        try {
            const { answer } = await askQuestion(evalCase.question);
            const score = scoreAnswer(answer, evalCase);

            results.push({
                ...evalCase,
                answer,
                ...score,
                prompt_version: activeVersion,
                timestamp: new Date().toISOString(),
            });

            if (score.passed) {
                passed++;
                console.log("PASS");
            } else {
                console.log(`FAIL — ${score.failures.join(", ")}`);
                if (verbose) console.log(`    Answer: ${answer.slice(0, 120)}...`);
            }

        } catch (err) {
            results.push({
                ...evalCase,
                passed: false,
                failures: [`Exception: ${err.message}`],
                prompt_version: activeVersion,
            });
            console.log(`ERROR — ${err.message}`);
        }
    }

    // Summary
    const total = evalCases.length;
    const pct = Math.round((passed / total) * 100);

    console.log("=".repeat(60));
    console.log(`Result: ${passed}/${total} passed (${pct}%)`);
    console.log(`Prompt version: ${activeVersion}`);

    // Save results to file — track quality over time
    const outFile = `evals/results-${activeVersion}-${Date.now()}.json`;
    writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Saved to ${outFile}`);

    return { passed, total, pct, results, promptVersion: activeVersion };
}