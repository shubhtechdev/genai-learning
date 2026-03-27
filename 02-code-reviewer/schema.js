// This is your contract. The prompt is written to produce this.
// The validator checks the LLM output against this.
export const reviewSchema = {
    score: "number 0-100 (overall code quality)",
    language: "string (detected language)",
    summary: "string (2-3 sentence overall assessment)",
    issues: [
        {
            id: "string (e.g. ISS-001)",
            type: "bug | security | performance | style | maintainability",
            severity: "critical | high | medium | low | info",
            line: "number | null (line number if identifiable)",
            title: "string (specific, actionable — what is wrong)",
            detail: "string (why it's a problem, what could go wrong)",
            fix: "string (concrete code suggestion or exact change to make)",
        },
    ],
    positives: ["string (things done well — always include at least one)"],
};

// Validator — checks LLM output has the shape we need
export function validateReview(data) {
    const errors = [];

    if (typeof data.score !== "number" || data.score < 0 || data.score > 100)
        errors.push("score must be a number 0-100");
    if (typeof data.summary !== "string" || data.summary.length < 10)
        errors.push("summary is missing or too short");
    if (!Array.isArray(data.issues))
        errors.push("issues must be an array");
    if (!Array.isArray(data.positives))
        errors.push("positives must be an array");

    const validTypes = ["bug", "security", "performance", "style", "maintainability"];
    const validSeverities = ["critical", "high", "medium", "low", "info"];

    (data.issues || []).forEach((issue, i) => {
        if (!validTypes.includes(issue.type))
            errors.push(`issues[${i}].type "${issue.type}" is invalid`);
        if (!validSeverities.includes(issue.severity))
            errors.push(`issues[${i}].severity "${issue.severity}" is invalid`);
        if (!issue.title || !issue.fix)
            errors.push(`issues[${i}] missing title or fix`);
    });

    return { valid: errors.length === 0, errors };
}