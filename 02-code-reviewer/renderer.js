const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

const SEVERITY_LABEL = {
    critical: "[CRITICAL]",
    high: "[HIGH]    ",
    medium: "[MEDIUM]  ",
    low: "[LOW]     ",
    info: "[INFO]    ",
};

export function renderReport(review) {
    const lines = [];

    lines.push(`${"=".repeat(60)}`);
    lines.push(`CODE REVIEW REPORT`);
    lines.push(`${"=".repeat(60)}`);
    lines.push(`Language : ${review.language}`);
    lines.push(`Score    : ${review.score}/100`);
    lines.push(`Summary  : ${review.summary}`);
    lines.push("");

    if (review.issues?.length) {
        // Sort by severity
        const sorted = [...review.issues].sort(
            (a, b) =>
                SEVERITY_ORDER.indexOf(a.severity) -
                SEVERITY_ORDER.indexOf(b.severity)
        );

        lines.push(`ISSUES (${sorted.length} found)`);
        lines.push("-".repeat(60));

        for (const issue of sorted) {
            const lineRef = issue.line ? ` — line ${issue.line}` : "";
            lines.push(`\n${SEVERITY_LABEL[issue.severity]} ${issue.title}${lineRef}`);
            lines.push(`  Type   : ${issue.type}`);
            lines.push(`  Problem: ${issue.detail}`);
            lines.push(`  Fix    : ${issue.fix}`);
        }
    } else {
        lines.push("No issues found.");
    }

    if (review.positives?.length) {
        lines.push(`\n${"=".repeat(60)}`);
        lines.push("POSITIVES");
        lines.push("-".repeat(60));
        review.positives.forEach((p) => lines.push(` + ${p}`));
    }

    lines.push(`\n${"=".repeat(60)}`);
    return lines.join("\n");
}