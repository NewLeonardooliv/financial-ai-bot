import OpenAI from "openai";
import { LLMProvider, LLMOptions } from "../agents/types";

export class OpenAIProvider implements LLMProvider {
  public name = "OpenAI";
  private client: OpenAI;
  private defaultOptions: Required<LLMOptions>;

  constructor(apiKey: string, defaultOptions?: Partial<LLMOptions>) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: false,
    });

    this.defaultOptions = {
      model: process.env.OPENAI_MODEL || "gpt-4",
      temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
      maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 2000,
      systemPrompt: "",
      ...defaultOptions,
    };
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    try {
      const finalOptions = { ...this.defaultOptions, ...options };

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (finalOptions.systemPrompt) {
        messages.push({
          role: "system",
          content: finalOptions.systemPrompt,
        });
      }

      messages.push({
        role: "user",
        content: prompt,
      });

      const completion = await this.client.chat.completions.create({
        model: finalOptions.model,
        messages,
        temperature: finalOptions.temperature,
        max_tokens: finalOptions.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error("No response generated from OpenAI");
      }

      return response;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error(
        `Failed to generate response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
