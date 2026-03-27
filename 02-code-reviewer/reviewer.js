import { ai } from "./client.js";
import { buildAnalysisPrompt, buildFormattingPrompt } from "./prompts.js";
import { validateReview } from "./schema.js";
import { withRetry } from "./utils.js";

async function callModel(contents, systemInstruction = null) {
  const config = {
    temperature: 0.2,
    maxOutputTokens: 8192,
  };
  if (systemInstruction) config.systemInstruction = systemInstruction;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config,
  });
  return response.text;
}

export async function reviewCode(code, filename = "") {
  const prompt1 = buildAnalysisPrompt(code, filename);
  const estimatedTokens = estimateTokens(prompt1);

  console.log(`Estimated input tokens: ~${estimatedTokens}`);

  if (estimatedTokens > 30000) {
    throw new Error(
      `Input too large (~${estimatedTokens} tokens). Split the file into smaller sections.`
    );
  }

  // --- Call 1: Analysis (free-form reasoning, no JSON pressure) ---
  console.log("Step 1/2: Analysing code...");
  const analysis = await withRetry(() =>
    callModel(buildAnalysisPrompt(code, filename))
  );

  // --- Call 2: Formatting (convert analysis to strict JSON) ---
  console.log("Step 2/2: Structuring output...");
  const raw = await withRetry(() =>
    callModel(buildFormattingPrompt(analysis))
  );

  // --- Parse ---
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let data;
  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON parse failed. Raw output:\n${cleaned}`);
  }

  // --- Validate schema ---
  const { valid, errors } = validateReview(data);
  if (!valid) {
    console.warn("Schema validation warnings:", errors);
    // Don't throw — partial output is still useful. Log and continue.
  }

  return data;
}

function estimateTokens(text) {
  // Rule of thumb: 1 token ≈ 4 characters for English code
  return Math.ceil(text.length / 4);
}
