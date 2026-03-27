# Gemini API Quickstart

## Installation

Install the Google Gen AI SDK using npm:

```bash
npm install @google/genai
```

## Initialize the client

Import GoogleGenAI and initialize with your API key:

```js
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

## Generate content

Call generateContent with a model name and your prompt:

```js
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Explain how embeddings work",
});
console.log(response.text);
```

## Streaming responses

Use generateContentStream to receive chunks as they are generated:

```js
const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash",
  contents: "Write a detailed explanation of RAG",
});
for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

## System instructions

Pass a system instruction to set model behaviour for the entire session:

```js
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Review this code",
  config: {
    systemInstruction: "You are a senior software engineer...",
    temperature: 0.2,
  },
});
```
