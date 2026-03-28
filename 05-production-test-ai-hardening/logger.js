import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

// Token cost per million — update when pricing changes
// https://ai.google.dev/gemini-api/docs/pricing
const COST_PER_1M_TOKENS = {
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "gemini-2.5-pro": { input: 1.25, output: 5.00 },
    "gemini-embedding-001": { input: 0.00, output: 0.00 }, // free
};

export function calculateCost(model, inputTokens, outputTokens) {
    const rates = COST_PER_1M_TOKENS[model];
    if (!rates) return null;
    return (
        (inputTokens / 1_000_000) * rates.input +
        (outputTokens / 1_000_000) * rates.output
    );
}

export function createLogger(logDir = "./logs") {
    mkdirSync(logDir, { recursive: true });
    const logFile = join(logDir, `${new Date().toISOString().slice(0, 10)}.jsonl`);

    function log(entry) {
        const record = {
            timestamp: new Date().toISOString(),
            ...entry,
        };
        // JSONL format — one JSON object per line, easy to grep and parse
        appendFileSync(logFile, JSON.stringify(record) + "\n");

        // Also print key metrics to console
        const cost = entry.cost_usd != null ? `$${entry.cost_usd.toFixed(6)}` : "n/a";
        const cached = entry.cache_hit ? " [CACHE HIT]" : "";
        console.log(
            `[${entry.type}]${cached} model=${entry.model} ` +
            `latency=${entry.latency_ms}ms tokens=${entry.total_tokens ?? "?"} cost=${cost}`
        );
    }

    return { log, logFile };
}

// Wrap any AI call with automatic logging
export async function loggedCall(logger, meta, fn) {
    const start = Date.now();
    let success = true;
    let error = null;
    let result;

    try {
        result = await fn();
    } catch (err) {
        success = false;
        error = err.message;
        throw err;
    } finally {
        const latency = Date.now() - start;
        logger.log({
            ...meta,
            latency_ms: latency,
            success,
            error,
        });
    }

    return result;
}