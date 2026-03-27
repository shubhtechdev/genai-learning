import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { sampleCommits } from "./commits.js";
import { getCommits } from "./git.js";
import { parseChangelog } from "./parser.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { toMarkdown } from "./renderer.js";
import { writeFileSync } from "fs";
import { withRetry } from "./utils.js";

const model = "gemini-2.5-flash";
dotenv.config();

const genai = new GoogleGenAI(process.env.GEMINI_API_KEY);

async function generateChangelog(commits) {
    const rawResponse = await genai.models.generateContent({
        model,
        contents: buildUserPrompt(commits),
        config: {
            systemInstruction: buildSystemPrompt(),
            temperature: 0.2,
            maxOutputTokens: 8192
        }
    });
    const response = parseChangelog(rawResponse.text);
    if (!response.success) {
        console.error("Parse failed:", response.error);
        console.error("Raw output was:", response.raw);
        process.exit(1);
    }
    return response.data;
}

async function generateChangelogStreamed(commits) {
    const stream = await genai.models.generateContentStream({
        model,
        contents: buildUserPrompt(commits),
        config: {
            systemInstruction: buildSystemPrompt(),
            temperature: 0.2
        }
    });

    let fullText = "";
    process.stdout.write("Generating");

    for await (const chunk of stream) {
        process.stdout.write(".");
        fullText += chunk.text;
    }

    console.log("done");
    return fullText;
}


const repoPath = process.env.GIT_REPO_PATH || ".";
const count = Number(process.env.GIT_LOG_COUNT) || 30;
const commits = getCommits(repoPath, count);
const result = await generateChangelog(commits);
console.log(JSON.stringify(result, null, 2));
const markdown = toMarkdown(result);
writeFileSync("CHANGELOG.md", markdown);
console.log("Done → CHANGELOG.md");

