# Gemini Embeddings

## What are embeddings

Embeddings are numerical representations of text as vectors of floating point numbers.
Similar text produces similar vectors. This property enables semantic search — finding
content by meaning rather than exact keyword match.

## Embedding model

Use text-embedding-004 for all embedding tasks. This model outputs 768-dimensional vectors.

## Generate an embedding

```js
const response = await ai.models.embedContent({
  model: "text-embedding-004",
  contents: "How do I use streaming in the Gemini API?",
});
const vector = response.embeddings[0].values;  // array of 768 floats
```

## Batch embedding

To embed multiple texts, call embedContent once per text. Group calls into batches
of 20 and add a 500ms pause between batches to stay within rate limits.

## Important constraint

Always use the same embedding model for both ingestion and queries. Mixing models
produces vectors in different mathematical spaces. Cosine similarity between
vectors from different models is meaningless — search results will be wrong with
no error thrown.

## Cosine similarity

Cosine similarity measures the angle between two vectors. A score of 1.0 means
identical, 0.0 means unrelated, -1.0 means opposite. For document retrieval,
scores above 0.7 are typically relevant. Scores below 0.5 indicate the retrieved
chunk is probably not useful for answering the question.
