import { logger } from "../utils/logger";
import { Expense } from "./agent-service";
import { ValidationError, NotFoundError } from "../middleware/error-handler";

export interface EvolutionMessage {
  number: string;
  text: string;
}

export interface EvolutionResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export class EvolutionService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
    this.apiKey = process.env.EVOLUTION_API_KEY || "";
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || "default";
  }

  async sendMessage(number: string, text: string): Promise<EvolutionResponse> {
    if (!number || !text) {
      throw new ValidationError("Phone number and text are required");
    }

    if (!this.apiKey) {
      throw new ValidationError("Evolution API key is not configured");
    }

    try {
      logger.info("Sending message via Evolution API", {
        number,
        textLength: text.length,
        instanceName: this.instanceName,
      });

      const response = await fetch(
        `${this.baseUrl}/message/sendText/${this.instanceName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.apiKey,
          },
          body: JSON.stringify({
            number,
            text,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError("Evolution API instance not found");
        }
        throw new Error(
          `Evolution API responded with status ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as EvolutionResponse;

      logger.info("Message sent successfully", {
        success: data.success,
        messageId: data.data?.key?.id,
      });

      return data;
    } catch (error) {
      logger.error("Failed to send message via Evolution API", {
        error: error instanceof Error ? error.message : "Unknown error",
        number,
      });

      throw error;
    }
  }

  formatExpenseResponse(expenses: Expense[]): string {
    if (!expenses || expenses.length === 0) {
      throw new ValidationError("Expenses array cannot be empty");
    }

    const currentDate = new Date().toLocaleDateString("pt-BR");

    if (expenses.length === 1) {
      const expense = expenses[0];

      return `📝 *Registro de Transação Concluído*

✍️ *Descrição:* ${expense.description}
💰 *Valor:* R$ ${expense.amount.toFixed(2)}
📊 *Tipo:* Despesa
🏷️ *Categoria:* ${expense.category}
📅 *Data:* ${currentDate}`;
    }

    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const categories = [
      ...new Set(expenses.map((expense) => expense.category)),
    ];

    let transactionDetails = `📝 *Registro de Múltiplas Transações Concluído*

📊 *Resumo:*
💰 *Total:* R$ ${totalAmount.toFixed(2)}
📈 *Quantidade:* ${expenses.length} despesa(s)
🏷️ *Categorias:* ${categories.join(", ")}

📋 *Detalhes das Transações:*`;

    expenses.forEach((expense, index) => {
      transactionDetails += `

${index + 1}. *${expense.description}*
   💰 R$ ${expense.amount.toFixed(2)} | 🏷️ ${expense.category}`;
    });

    transactionDetails += `

📅 *Data:* ${currentDate}`;

    return transactionDetails;
  }
}

export const evolutionService = new EvolutionService();
