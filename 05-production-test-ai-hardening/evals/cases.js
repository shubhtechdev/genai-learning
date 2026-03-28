export const evalCases = [
    // Format: question, expected keywords that MUST appear in the answer
    {
        id: "eval-001",
        category: "factual",
        question: "How do I install the Gemini SDK?",
        must_contain: ["npm install", "@google/genai"],
        must_not_contain: ["pip", "python"],
        min_length: 50,
    },
    {
        id: "eval-002",
        category: "factual",
        question: "What model should I use for embeddings?",
        must_contain: ["gemini-embedding-001"],
        must_not_contain: ["text-embedding-004"],  // deprecated — must not recommend it
        min_length: 30,
    },
    {
        id: "eval-003",
        category: "grounding",
        question: "What is the population of Delhi?",
        must_contain: ["don't have", "not enough", "cannot"],  // must refuse, not hallucinate
        must_not_contain: [],
        min_length: 10,
    },
    {
        id: "eval-004",
        category: "code",
        question: "Show me how to use streaming with Gemini in Node.js",
        must_contain: ["generateContentStream", "for await"],
        must_not_contain: [],
        min_length: 100,
    },
    {
        id: "eval-005",
        category: "factual",
        question: "What is the context window size for gemini-2.5-flash?",
        must_contain: ["1 million", "1M"],
        must_not_contain: [],
        min_length: 20,
    },
];