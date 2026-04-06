import { retrieve } from "./rag/retriever.js";      // reuse Phase 6 retriever
import { generateAnswer } from "./generator.js"; // reuse Phase 5 generator
import {
    scoreFaithfulness,
    scoreAnswerRelevance,
    scoreContextPrecision,
    scoreContextRecall,
} from "./judge.js";
import { evalCases } from "./evalCases.js";
import { writeFileSync } from "fs";

const DELAY_MS = 6000; // 6s between cases — respect rate limits

async function runSingleEval(evalCase) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`${evalCase.id} [${evalCase.category}]`);
    console.log(`Q: ${evalCase.question}`);

    // Step 1: Retrieve context
    const chunks = await retrieve(evalCase.question);
    console.log(`  Retrieved ${chunks.length} chunks`);

    // Step 2: Generate answer
    const { answer } = await generateAnswer(evalCase.question, chunks);
    console.log(`  Answer: ${answer.slice(0, 100)}...`);

    // Step 3: Score all metrics in parallel
    const [faithfulness, relevance, precision, recall] = await Promise.all([
        scoreFaithfulness(answer, chunks),
        scoreAnswerRelevance(evalCase.question, answer),
        scoreContextPrecision(evalCase.question, chunks),
        evalCase.groundTruth
            ? scoreContextRecall(evalCase.question, evalCase.groundTruth, chunks)
            : Promise.resolve({ score: null, reasoning: "No ground truth provided" }),
    ]);

    const result = {
        ...evalCase,
        answer,
        chunks_retrieved: chunks.length,
        scores: {
            faithfulness: { score: faithfulness.score, reasoning: faithfulness.reasoning },
            answer_relevance: { score: relevance.score, reasoning: relevance.reasoning },
            context_precision: { score: precision.score, reasoning: precision.reasoning },
            context_recall: { score: recall.score, reasoning: recall.reasoning },
        },
        // Overall = average of non-null scores
        overall: (() => {
            const scores = [faithfulness.score, relevance.score, precision.score, recall.score]
                .filter((s) => s !== null);
            return scores.reduce((a, b) => a + b, 0) / scores.length;
        })(),
        timestamp: new Date().toISOString(),
    };

    console.log(`  Scores → faithfulness: ${faithfulness.score?.toFixed(2)} | relevance: ${relevance.score?.toFixed(2)} | precision: ${precision.score?.toFixed(2)} | recall: ${recall.score?.toFixed(2) ?? "n/a"}`);
    console.log(`  Overall: ${result.overall.toFixed(2)}`);

    return result;
}

async function runEvals() {
    console.log(`Running ${evalCases.length} eval cases against Phase 6 RAG pipeline`);
    console.log(`Judge model: gemini-2.5-flash-lite | Generator model: gemini-2.5-flash\n`);

    const results = [];

    for (let i = 0; i < evalCases.length; i++) {
        const result = await runSingleEval(evalCases[i]);
        results.push(result);

        if (i < evalCases.length - 1) {
            process.stdout.write(`  Waiting ${DELAY_MS / 1000}s...`);
            await new Promise((r) => setTimeout(r, DELAY_MS));
            console.log(" done");
        }
    }

    // Aggregate scores
    const avgScores = {
        faithfulness: avg(results.map((r) => r.scores.faithfulness.score)),
        answer_relevance: avg(results.map((r) => r.scores.answer_relevance.score)),
        context_precision: avg(results.map((r) => r.scores.context_precision.score)),
        context_recall: avg(results.filter((r) => r.scores.context_recall.score !== null)
            .map((r) => r.scores.context_recall.score)),
        overall: avg(results.map((r) => r.overall)),
    };

    console.log(`\n${"═".repeat(50)}`);
    console.log("EVAL RESULTS SUMMARY");
    console.log(`${"═".repeat(50)}`);
    Object.entries(avgScores).forEach(([k, v]) => {
        const bar = "█".repeat(Math.round((v ?? 0) * 20));
        const status = (v ?? 0) >= 0.7 ? "PASS" : "NEEDS WORK";
        console.log(`  ${k.padEnd(20)} ${v?.toFixed(3) ?? " n/a"} ${bar} ${status}`);
    });

    // Save full results
    const outFile = `eval-results-${Date.now()}.json`;
    writeFileSync(outFile, JSON.stringify({ avgScores, results }, null, 2));
    console.log(`\nFull results saved to ${outFile}`);

    // Exit with error if overall is below threshold — for CI integration
    if (avgScores.overall < 0.70) {
        console.error("\nOverall score below 0.70 threshold. RAG pipeline needs improvement.");
        process.exit(1);
    }
}

function avg(arr) {
    const valid = arr.filter((v) => v !== null && v !== undefined);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

runEvals().catch(console.error);