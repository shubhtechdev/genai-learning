# Gemini Models

## Available models

gemini-2.5-flash is the recommended model for most use cases. It is fast, cost-efficient,
and supports a 1 million token context window. It handles text, code, images, and documents.

gemini-2.5-pro is the highest capability model. Use it for complex reasoning tasks,
difficult coding problems, and nuanced analysis where quality matters more than speed.

## Choosing a model

For structured output tasks like JSON generation, use gemini-2.5-flash with temperature 0.2.
For creative or open-ended tasks, use temperature 0.7 to 1.0.
For production systems where cost matters, gemini-2.5-flash is the default choice.
For evaluation, testing, and quality-critical tasks, gemini-2.5-pro is preferred.

## Context window

gemini-2.5-flash supports up to 1 million input tokens and 65,536 output tokens.
A typical page of text is approximately 500 tokens. A 100-page document is roughly 50,000 tokens.

## Rate limits on free tier

The free tier allows 15 requests per minute for generateContent and 1500 requests per day.
For embedding, the limit is 1500 requests per minute. Exceeding limits returns a 429 error.
Use exponential backoff retry logic to handle 429 responses gracefully.
