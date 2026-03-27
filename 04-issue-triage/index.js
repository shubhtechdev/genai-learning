import { triageIssue } from "./agent.js";
import dotenv from "dotenv";
dotenv.config();

const issueNumber = parseInt(process.argv[2]);

if (!issueNumber || isNaN(issueNumber)) {
    console.error("Usage: node index.js <issue-number>");
    console.error("Example: node index.js 42");
    process.exit(1);
}

const result = await triageIssue(issueNumber);

console.log("\n" + "=".repeat(50));
if (result.success) {
    console.log(`Done in ${result.iterations} iterations`);
    console.log(`Summary: ${result.summary}`);
} else {
    console.error(`Failed: ${result.error}`);
    process.exit(1);
}