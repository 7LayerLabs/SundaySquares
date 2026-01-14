
import { GoogleGenAI } from "@google/genai";
import { ProjectFile, ChatMessage } from "../types";

export class GeminiService {
  // Use any to avoid complex type definitions for the internal client while maintaining compatibility
  private ai: any;

  constructor() {
    // Correct initialization with named parameter and direct process.env.API_KEY usage
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeAndRespond(
    prompt: string,
    files: ProjectFile[],
    history: ChatMessage[]
  ) {
    // Construct the context with all available files
    const fileContext = files.map(f => `FILE: ${f.path}\nCONTENT:\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
    
    const systemInstruction = `
      You are a world-class Senior Software Architect. 
      You are helping a developer build a project.
      The current project context is provided below. 
      
      CRITICAL RULES:
      1. When providing code, always use markdown blocks with the correct language.
      2. If you suggest changes to existing files, specify exactly what to change.
      3. If you suggest new files, provide the full path and full content.
      4. Be concise but extremely technically accurate.
      5. Assume modern React (18+), TypeScript, and Tailwind CSS.

      PROJECT CONTEXT:
      ${fileContext}
    `;

    try {
      // Use ai.models.generateContent with both model name and prompt parts
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 8000 }
        },
      });

      // Directly access .text property from GenerateContentResponse
      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
}

export const geminiService = new GeminiService();
