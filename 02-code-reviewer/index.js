import { readFileSync } from "fs";
import { reviewCode } from "./reviewer.js";
import { validateInput } from "./validator.js";
import { renderReport } from "./renderer.js";
import { writeFileSync } from "fs";

const filepath = process.argv[2];

if (!filepath) {
    console.error("Usage: node index.js <path-to-file>");
    process.exit(1);
}

const code = readFileSync(filepath, "utf8");
const filename = filepath.split("/").pop();

// Validate before calling the API
const { valid, errors } = validateInput(code, filename);
if (!valid) {
    console.error("Input validation failed:");
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
}

console.log(`Reviewing ${filename} (${code.length} chars)...\n`);

const review = await reviewCode(code, filename);
const report = renderReport(review);
process.stdout.write(report + "\n");
const outFile = `${filename}.review.txt`;
writeFileSync(outFile, report);
console.log(`\nSaved to ${outFile}`);