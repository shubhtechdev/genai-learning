// Every prompt lives here. Never inline prompts in business logic.
// Bump the version string whenever you change a prompt.
// Keep old versions — you'll need them for evals and rollback.

export const prompts = {
    rag_system: {
        current: "v1.2",
        versions: {
            "v1.0": {
                text: `Answer the question using ONLY the provided context.
If the context does not contain enough information, say so.
Cite sources using [1], [2] notation.`,
                notes: "Initial version",
                created: "2026-03-01",
            },
            "v1.1": {
                text: `Answer the question using ONLY the provided context below.

Rules:
- If the context does not contain enough information to answer, say "I don't have enough information in the docs to answer this." Do not guess.
- Always cite which source(s) your answer is based on using [1], [2] notation.
- Be concise and technical — the user is a developer.
- If the answer includes code, format it as a code block.`,
                notes: "Added explicit rules, improved citation instruction",
                created: "2026-03-10",
            },
            "v1.2": {
                text: `Answer the question using ONLY the provided context below.

Rules:
- If the context does not contain enough information to answer, say "I don't have enough information in the docs to answer this." Do not guess.
- Always cite which source(s) your answer is based on using [1], [2] notation.
- Be concise and technical — the user is a developer.
- If the answer includes code, format it as a code block.
- If multiple sources contradict each other, mention the discrepancy.`,
                notes: "Added contradiction handling",
                created: "2026-03-28",
            },
        },
    },

    code_review_analysis: {
        current: "v2.0",
        versions: {
            "v1.0": {
                text: `You are a senior software engineer doing a thorough code review...`,
                notes: "Initial version",
                created: "2026-03-01",
            },
            "v2.0": {
                text: `You are a senior software engineer doing a thorough code review.
Analyze this code carefully. Identify ALL of the following:
- Bugs: logic errors, off-by-one, null/undefined risks, unhandled edge cases
- Security: injection risks, hardcoded secrets, missing auth checks
- Performance: unnecessary loops, blocking operations, memory leaks
- Maintainability: unclear naming, missing error handling, dead code

For each issue: state the line, explain why it's a problem, give concrete fix code.
Note at least one positive observation.
Give an overall quality score 0-100.`,
                notes: "Expanded categories, made score mandatory",
                created: "2026-03-15",
            },
        },
    },
};

export function getPrompt(name, version = null) {
    const entry = prompts[name];
    if (!entry) throw new Error(`Unknown prompt: ${name}`);

    const v = version ?? entry.current;
    const prompt = entry.versions[v];
    if (!prompt) throw new Error(`Unknown version ${v} for prompt ${name}`);

    return { text: prompt.text, version: v, name };
}

export function listPrompts() {
    return Object.entries(prompts).map(([name, entry]) => ({
        name,
        current: entry.current,
        versions: Object.keys(entry.versions),
    }));
}