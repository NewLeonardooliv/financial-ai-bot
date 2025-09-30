import { logger } from "../utils/logger";
import { ValidationError } from "../middleware/error-handler";
import { ExpenseExtractorAgent } from "../agents/expense-extractor-agent";
import { OpenAIProvider } from "../providers/openai-provider";
import { generateSessionId } from "../utils/session";

export interface Expense {
  description: string;
  amount: number;
  category: string;
  currency: string;
  confidence: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  categories: string[];
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data: {
    expenses: Expense[];
    summary: ExpenseSummary;
    extractedAt: string;
    confidence: number;
  };
  timestamp: string;
  requestId: string;
}

export class AgentService {
  private expenseExtractorAgent: ExpenseExtractorAgent;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ValidationError("OpenAI API key is required");
    }

    const llmProvider = new OpenAIProvider(apiKey, {
      model: process.env.OPENAI_MODEL || "gpt-4",
      temperature: 0.1,
      maxTokens: 1000,
    });

    this.expenseExtractorAgent = new ExpenseExtractorAgent(llmProvider);
  }

  async extractExpenses(text: string): Promise<AgentResponse> {
    if (!text || text.trim().length === 0) {
      throw new ValidationError("Text input is required and cannot be empty");
    }

    try {
      logger.info("Extracting expenses using local agent", { text });

      const requestId = generateSessionId();
      const timestamp = new Date().toISOString();

      const result = await this.expenseExtractorAgent.execute({
        text,
        language: "portuguese",
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to extract expenses");
      }

      const response: AgentResponse = {
        success: true,
        message: "Expenses extracted successfully",
        data: {
          expenses: result.data.expenses,
          summary: result.data.summary,
          extractedAt: result.data.extractedAt.toISOString(),
          confidence: result.data.confidence,
        },
        timestamp,
        requestId,
      };

      logger.info("Expense extraction completed", {
        success: response.success,
        expensesCount: response.data.expenses.length,
        totalAmount: response.data.summary.totalAmount,
        requestId: response.requestId,
      });

      return response;
    } catch (error) {
      logger.error("Failed to extract expenses", {
        error: error instanceof Error ? error.message : "Unknown error",
        text,
      });

      throw error;
    }
  }
}

export const agentService = new AgentService();
