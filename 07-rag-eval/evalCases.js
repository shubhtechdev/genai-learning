export const evalCases = [
    {
        id: "eval-001",
        category: "retrieval_accuracy",
        question: "What is contextual retrieval and how does it improve RAG?",
        groundTruth: "Contextual retrieval prepends a short LLM-generated description of where each chunk fits in the document before embedding. This context enriches the embedding so retrieval finds the right chunks even when they use different vocabulary than the query. It reduces retrieval failures by approximately 49%.",
    },
    {
        id: "eval-002",
        category: "factual",
        question: "What are the recommended chunk sizes for technical documentation?",
        groundTruth: "For technical documentation, 300-600 characters (approximately 75-150 tokens) works well. This is small enough to be specific but large enough to contain a complete thought.",
    },
    {
        id: "eval-003",
        category: "comparison",
        question: "How does late chunking differ from standard chunking?",
        groundTruth: "Late chunking embeds the entire document first using a long-context embedding model, then splits the resulting token embeddings by position. Standard chunking splits the text first and then embeds each chunk independently. Late chunking produces per-chunk embeddings that retain full document context by construction.",
    },
    {
        id: "eval-004",
        category: "grounding",
        question: "What is the capital of France?",
        groundTruth: null, // no ground truth — should return "not in docs"
    },
    {
        id: "eval-005",
        category: "memory",
        question: "What importance score should a user preference memory get?",
        groundTruth: "User preference memories should get an importance score of 0.8, which is higher than facts (0.5) and sources (0.6) but lower than conclusions (0.9).",
    },
];