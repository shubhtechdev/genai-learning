export async function withRetry(fn, retries = 3, baseDelayMs = 1000) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const isLast = attempt === retries - 1;
            if (isLast) throw err;

            // 429 = rate limited, 503 = transient server error
            const retryable = err?.status === 429 || err?.status === 503;
            if (!retryable) throw err;

            const delay = baseDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s
            console.warn(`Attempt ${attempt + 1} failed [${err.status}], retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}