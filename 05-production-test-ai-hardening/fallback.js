import { ai } from "./client.js";

// Ordered list of models to try — fast/cheap first, capable/expensive last
const MODEL_CHAIN = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",   // default — fast, cheap
    "gemini-2.5-pro",     // fallback — slower, more capable, more expensive    
];

// What to return if all models fail — never crash, always respond
function degradedResponse(originalError) {
    return {
        text: "The AI service is temporarily unavailable. Please try again in a moment.",
        model: "degraded",
        degraded: true,
        error: originalError.message,
    };
}

export async function callWithFallback(buildRequest, logger) {
    let lastError;

    for (const model of MODEL_CHAIN) {
        try {
            const request = buildRequest(model);   // caller builds the request per model

            const response = await ai.models.generateContent(request);

            return {
                text: response.text,
                model,
                degraded: false,
                usageMetadata: response.usageMetadata,
            };

        } catch (err) {
            lastError = err;

            // Don't fall through on user errors — only on model/infra errors
            const isModelError = err?.status === 429 ||
                err?.status === 500 ||
                err?.status === 503 ||
                err?.message?.includes("overloaded");

            if (!isModelError) throw err;  // bad prompt, auth error etc — surface immediately

            console.warn(`Model ${model} failed (${err.status ?? err.message}), trying next...`);
            logger?.log({
                type: "fallback",
                from_model: model,
                reason: err.message,
                timestamp: new Date().toISOString(),
            });
        }
    }

    // All models exhausted — degrade gracefully
    console.error("All models in fallback chain failed. Returning degraded response.");
    return degradedResponse(lastError);
}