import { ai } from "./client.js";
import { withRetry } from "./utils.js";

const JUDGE_MODEL = "gemini-2.5-flash-lite"; // cheap — runs many times per eval

async function judgeWithScore(prompt) {
    const response = await withRetry(() =>
        ai.models.generateContent({
            model: JUDGE_MODEL,
            contents: prompt,
            config: {
                temperature: 0,          // judges must be deterministic
                maxOutputTokens: 512,
                responseMimeType: "application/json", // native JSON mode — no parsing needed
            },
        })
    );

    try {
        return JSON.parse(response.text);
    } catch {
        return { score: 0, reasoning: "Failed to parse judge response" };
    }
}

export async function scoreFaithfulness(answer, contextChunks) {
    const context = contextChunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

    return judgeWithScore(`You are evaluating whether an AI answer is faithful to its source context.

CONTEXT:
${context}

ANSWER:
${answer}

Score the faithfulness from 0.0 to 1.0:
- 1.0: Every claim in the answer is directly supported by the context
- 0.5: Most claims are supported but some are inferred or extrapolated
- 0.0: The answer contains significant information not present in the context

Respond with JSON only: { "score": <0.0-1.0>, "reasoning": "<one sentence>", "unsupported_claims": ["<claim>"] }`);
}

export async function scoreAnswerRelevance(question, answer) {
    return judgeWithScore(`You are evaluating whether an AI answer is relevant to the question asked.

QUESTION: ${question}

ANSWER: ${answer}

Score the relevance from 0.0 to 1.0:
- 1.0: The answer directly and completely addresses the question
- 0.5: The answer is related but doesn't fully address the question
- 0.0: The answer is off-topic or doesn't address the question at all

Respond with JSON only: { "score": <0.0-1.0>, "reasoning": "<one sentence>" }`);
}

export async function scoreContextPrecision(question, contextChunks) {
    const chunksWithIndex = contextChunks
        .map((c, i) => `[${i + 1}] ${c.content.slice(0, 300)}`)
        .join("\n\n");

    return judgeWithScore(`You are evaluating whether retrieved context chunks are relevant to the question.

QUESTION: ${question}

RETRIEVED CHUNKS:
${chunksWithIndex}

For each chunk, decide if it is relevant to answering the question.
Score overall precision from 0.0 to 1.0:
- 1.0: All retrieved chunks are relevant to the question
- 0.5: About half the chunks are relevant
- 0.0: No chunks are relevant to the question

Respond with JSON only: {
  "score": <0.0-1.0>,
  "reasoning": "<one sentence>",
  "chunk_relevance": { "1": true/false, "2": true/false }
}`);
}

export async function scoreContextRecall(question, groundTruthAnswer, contextChunks) {
    const context = contextChunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

    return judgeWithScore(`You are evaluating whether retrieved context contains the information needed to answer a question.

QUESTION: ${question}

GROUND TRUTH ANSWER (what the correct answer should contain):
${groundTruthAnswer}

RETRIEVED CONTEXT:
${context}

Score context recall from 0.0 to 1.0:
- 1.0: All information needed for the ground truth answer is present in the context
- 0.5: Some needed information is present but key parts are missing
- 0.0: The context does not contain the information needed to produce the ground truth answer

Respond with JSON only: { "score": <0.0-1.0>, "reasoning": "<one sentence>", "missing_info": ["<what's missing>"] }`);
}