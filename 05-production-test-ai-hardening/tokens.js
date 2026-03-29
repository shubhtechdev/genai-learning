import { ai } from "./client.js";
export async function countTokens(model, contents, systemInstruction) {
    const response = await ai.models.countTokens({
        model,
        contents,
        // config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.totalTokens;
}