export function parseChangelog(rawText) {
    // Models sometimes wrap output in markdown fences despite instructions
    const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    try {
        return { success: true, data: JSON.parse(cleaned) };
    } catch (e) {
        return {
            success: false,
            error: "Failed to parse LLM output as JSON",
            raw: cleaned,
        };
    }
}