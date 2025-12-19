
import { GoogleGenAI } from "@google/genai";

// Initialize the client
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Property Manager Assistant for "FormosaStay" in Taiwan.
You have expertise in:
1. Taiwan Rental Housing Market Development and Regulation Act.
2. Drafting professional messages in Traditional Chinese (Taiwan locale) and English for Line/Email.
3. Calculating rental yields, proration, and deposit returns.
4. AWS System Architecture for SaaS.

When asked about contract termination, explain the legal implications in Taiwan (e.g., 1-month notice).
When asked about AWS, suggest a serverless architecture (Amplify, Cognito, Lambda, DynamoDB) suitable for a small-to-medium scale app.

Keep responses concise, professional, and helpful.
`;

export const askAssistant = async (prompt: string): Promise<string> => {
    try {
        // Updated model to gemini-3-pro-preview for complex reasoning tasks
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.7,
            }
        });
        return response.text || "I couldn't generate a response at this time.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I encountered an error connecting to the AI service. Please check your API key.";
    }
};
