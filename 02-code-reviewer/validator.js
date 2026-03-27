const SUPPORTED_EXTENSIONS = [
    ".js", ".ts", ".py", ".java", ".go", ".rs",
    ".cs", ".cpp", ".c", ".rb", ".php", ".swift",
];

const MAX_CHARS = 12000; // ~3000 tokens — enough for any single file

export function validateInput(code, filename = "") {
    const errors = [];

    if (!code || code.trim().length === 0)
        errors.push("Code input is empty");

    if (code.length > MAX_CHARS)
        errors.push(
            `Input too large (${code.length} chars). Max is ${MAX_CHARS}. Split into smaller functions/files.`
        );

    if (filename) {
        const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext))
            errors.push(`Unsupported file type: ${ext}`);
    }

    return { valid: errors.length === 0, errors };
}