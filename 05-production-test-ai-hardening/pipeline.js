import { getCachedResponse, setCachedResponse } from "./cache.js";
import { callWithFallback } from "./fallback.js";
import { createLogger, loggedCall, calculateCost } from "./logger.js";
import { getPrompt } from "./promptRegistry.js";
import { countTokens } from "./tokens.js";
import { retrieve } from "./phase-3-code/retriever.js";     // from Phase 3

const logger = createLogger();

export async function hardenedQuery(question) {
    const startTotal = Date.now();

    // ── Pillar 1: Semantic cache check ─────────────────────────────
    const cacheResult = await getCachedResponse(question);

    if (cacheResult.hit) {
        logger.log({
            type: "generate",
            model: "cache",
            cache_hit: true,
            latency_ms: Date.now() - startTotal,
            question: question.slice(0, 80),
            similarity: cacheResult.similarity,
            total_tokens: 0,
            cost_usd: 0,
            success: true,
        });

        return {
            answer: cacheResult.answer,
            sources: [],
            cache_hit: true,
            similarity: cacheResult.similarity,
        };
    }

    // ── Phase 3: Retrieve relevant chunks ──────────────────────────
    const chunks = await retrieve(question);

    // ── Pillar 5: Get versioned prompt ─────────────────────────────
    const { text: systemPrompt, version: promptVersion } = getPrompt("rag_system");

    // Build the user prompt (same as Phase 3 generator.js)
    const context = chunks
        .map((c, i) => `[${i + 1}] Source: ${c.source}\n${c.content}`)
        .join("\n\n---\n\n");

    const userPrompt = `CONTEXT:\n${context}\n\nQUESTION: ${question}`;

    // ── Bonus: Count tokens before calling ─────────────────────────
    const estimatedTokens = await countTokens(
        "gemini-2.5-flash", userPrompt, systemPrompt
    );
    console.log(`Input tokens: ${estimatedTokens}`);

    // ── Pillar 4: Fallback chain + Pillar 3: Logging ───────────────
    const result = await loggedCall(
        logger,
        {
            type: "generate",
            prompt_version: promptVersion,
            cache_hit: false,
            question: question.slice(0, 80),
            input_tokens: estimatedTokens,
        },
        () => callWithFallback(
            (model) => ({
                model,
                contents: userPrompt,
                config: { systemInstruction: systemPrompt, temperature: 0.1, maxOutputTokens: 1024 },
            }),
            logger
        )
    );

    // Enrich log with cost data once we have usage metadata
    const inputT = result.usageMetadata?.promptTokenCount ?? estimatedTokens;
    const outputT = result.usageMetadata?.candidatesTokenCount ?? 0;
    logger.log({
        type: "generate_complete",
        model: result.model,
        input_tokens: inputT,
        output_tokens: outputT,
        total_tokens: inputT + outputT,
        cost_usd: calculateCost(result.model, inputT, outputT),
        prompt_version: promptVersion,
        degraded: result.degraded,
        success: true,
        latency_ms: Date.now() - startTotal,
    });

    // ── Pillar 1: Store in semantic cache ──────────────────────────
    if (!result.degraded) {
        await setCachedResponse(question, cacheResult.embedding, result.text);
    }

    return {
        answer: result.text,
        sources: [...new Set(chunks.map((c) => c.source))],
        model: result.model,
        prompt_version: promptVersion,
        cache_hit: false,
        tokens: inputT + outputT,
        cost_usd: calculateCost(result.model, inputT, outputT),
        degraded: result.degraded,
    };
}