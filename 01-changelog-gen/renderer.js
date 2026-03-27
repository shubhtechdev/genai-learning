export function toMarkdown(changelog) {
    const { summary, date, categories } = changelog;

    const lines = [
        `# Changelog`,
        ``,
        `> ${summary}`,
        ``,
        `_Generated: ${date}_`,
    ];

    const labelMap = {
        features: "Features",
        bugFixes: "Bug Fixes",
        performance: "Performance",
        refactoring: "Refactoring",
        removed: "Removed",       // ← new
        dependencies: "Dependencies",
        docs: "Documentation",
    };

    for (const [key, label] of Object.entries(labelMap)) {
        const items = categories[key];
        if (!items?.length) continue;

        lines.push(``, `## ${label}`, ``);

        for (const item of items) {
            const severity = item.severity ? ` _(${item.severity})_` : "";
            lines.push(`- **${item.title}**${severity}: ${item.detail}`);
        }
    }

    return lines.join("\n");
}