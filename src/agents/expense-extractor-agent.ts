import { logger } from "../utils/logger";
import {
  Agent,
  AgentContext,
  AgentResult,
  LLMProvider,
  ExpenseExtractorRequest,
  ExpenseExtractorResult,
} from "./types";
import { generateSessionId } from "../utils/session";

export class ExpenseExtractorAgent implements Agent {
  public id = "expense-extractor-agent";
  public name = "Expense Extractor";
  public description =
    "Agente especialista em extrair valores e categorias de gastos de mensagens de texto";

  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  async execute(
    input: ExpenseExtractorRequest
  ): Promise<AgentResult<ExpenseExtractorResult>> {
    const context: AgentContext = {
      sessionId: generateSessionId(),
      timestamp: new Date(),
      metadata: {
        textLength: input.text.length,
        language: input.language || "portuguese",
      },
    };

    try {
      logger.info(
        `Extraindo gastos do texto: "${input.text.substring(0, 50)}..."`
      );

      const extractedExpenses = await this.extractExpensesWithLLM(
        input.text,
        input.language
      );

      const result: ExpenseExtractorResult = {
        expenses: extractedExpenses,
        summary: {
          totalExpenses: extractedExpenses.length,
          totalAmount: extractedExpenses.reduce(
            (sum, expense) => sum + expense.amount,
            0
          ),
          categories: [
            ...new Set(extractedExpenses.map((expense) => expense.category)),
          ],
        },
        extractedAt: new Date(),
        confidence: this.calculateConfidence(extractedExpenses),
      };

      logger.info("\nExtração de gastos concluída!");
      logger.info(
        `Resumo: ${
          result.summary.totalExpenses
        } gastos encontrados, totalizando R$ ${result.summary.totalAmount.toFixed(
          2
        )}`
      );
      logger.info(`Categorias: ${result.summary.categories.join(", ")}`);

      return {
        success: true,
        data: result,
        metadata: {
          sessionId: context.sessionId,
          processingTime: Date.now() - context.timestamp.getTime(),
        },
      };
    } catch (error) {
      logger.error(`Erro ao extrair gastos: ${error}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        metadata: {
          sessionId: context.sessionId,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
      };
    }
  }

  private async extractExpensesWithLLM(
    text: string,
    language: string = "portuguese"
  ): Promise<
    Array<{
      description: string;
      amount: number;
      category: string;
      currency: string;
      confidence: number;
    }>
  > {
    const prompt = `Analise o seguinte texto e extraia todas as informações de gastos/despesas encontradas.

IMPORTANTE: Retorne APENAS um JSON válido, sem texto adicional, seguindo EXATAMENTE este formato:
{
  "expenses": [
    {
      "description": "descrição clara do gasto",
      "amount": valor_numerico_sem_simbolos,
      "category": "categoria_do_gasto",
      "currency": "BRL",
      "confidence": 0.9
    }
  ]
}

Categorias disponíveis: alimentação, transporte, saúde, educação, lazer, moradia, vestuário, serviços, combustível, farmácia, supermercado, restaurante, outros

Exemplos de categorização:
- "almoço", "jantar", "comida", "restaurante" → alimentação
- "uber", "taxi", "ônibus", "gasolina" → transporte
- "médico", "farmácia", "remédio" → saúde
- "supermercado", "mercado" → supermercado

Texto para análise: "${text}"

Idioma: ${language}`;

    try {
      logger.info("Enviando prompt para LLM...");
      const response = await this.llmProvider.generate(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
        systemPrompt:
          "Você é um especialista em análise financeira. Extraia gastos de textos e retorne APENAS JSON válido, sem explicações adicionais.",
      });

      logger.info(
        "Resposta do LLM recebida:",
        response.substring(0, 200) + "..."
      );

      const cleanResponse = response
        .trim()
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");

      const parsedResponse = JSON.parse(cleanResponse);

      if (!parsedResponse.expenses || !Array.isArray(parsedResponse.expenses)) {
        logger.info(
          "Resposta do LLM não contém expenses válidos, usando fallback"
        );
        return this.fallbackExtraction(text);
      }

      const extractedExpenses = parsedResponse.expenses.map(
        (expense: {
          description?: string;
          amount?: number;
          category?: string;
          currency?: string;
          confidence?: number;
        }) => ({
          description: expense.description || "",
          amount: parseFloat(String(expense.amount)) || 0,
          category: expense.category || "outros",
          currency: expense.currency || "BRL",
          confidence: Math.min(Math.max(expense.confidence || 0.8, 0), 1),
        })
      );

      logger.info(`LLM extraiu ${extractedExpenses.length} gastos com sucesso`);
      return extractedExpenses;
    } catch (error) {
      logger.info("Erro na análise com LLM, usando extração básica:", error);
      return this.fallbackExtraction(text);
    }
  }

  private fallbackExtraction(text: string): Array<{
    description: string;
    amount: number;
    category: string;
    currency: string;
    confidence: number;
  }> {
    const expenses: Array<{
      description: string;
      amount: number;
      category: string;
      currency: string;
      confidence: number;
    }> = [];

    logger.info("Usando extração básica (fallback)");

    const moneyRegex = /(?:R\$\s*)?(\d+(?:[.,]\d{2})?)/g;
    const matches = text.match(moneyRegex);

    if (matches) {
      const textParts = text.split(/(?:R\$\s*)?\d+(?:[.,]\d{2})?/);

      matches.forEach((match, index) => {
        const amount = parseFloat(
          match.replace(/[R$\s]/g, "").replace(",", ".")
        );

        if (amount > 0) {
          const contextBefore = textParts[index] || "";
          const contextAfter = textParts[index + 1] || "";
          const fullContext = (
            contextBefore +
            " " +
            contextAfter
          ).toLowerCase();

          const description = this.extractDescriptionFromContext(
            fullContext,
            amount
          );
          const category = this.categorizeByKeywords(fullContext);

          expenses.push({
            description,
            amount,
            category,
            currency: "BRL",
            confidence: 0.4,
          });
        }
      });
    }

    logger.info(`Extração básica encontrou ${expenses.length} gastos`);
    return expenses;
  }

  private extractDescriptionFromContext(
    context: string,
    amount: number
  ): string {
    const keywords = [
      "almoço",
      "jantar",
      "lanche",
      "comida",
      "restaurante",
      "padaria",
      "uber",
      "taxi",
      "ônibus",
      "metro",
      "gasolina",
      "combustível",
      "médico",
      "hospital",
      "farmácia",
      "remédio",
      "consulta",
      "supermercado",
      "mercado",
      "açougue",
      "cinema",
      "teatro",
      "show",
      "festa",
      "luz",
      "água",
      "gás",
      "internet",
      "aluguel",
      "roupa",
      "calçado",
      "loja",
      "shopping",
    ];

    for (const keyword of keywords) {
      if (context.includes(keyword)) {
        return `${
          keyword.charAt(0).toUpperCase() + keyword.slice(1)
        } - R$ ${amount.toFixed(2)}`;
      }
    }

    const words = context
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2);
    if (words.length > 0) {
      return `${
        words[0].charAt(0).toUpperCase() + words[0].slice(1)
      } - R$ ${amount.toFixed(2)}`;
    }

    return `Gasto - R$ ${amount.toFixed(2)}`;
  }

  private categorizeByKeywords(text: string): string {
    const textLower = text.toLowerCase();

    const categoryKeywords = {
      alimentação: [
        "comida",
        "almoço",
        "jantar",
        "lanche",
        "restaurante",
        "padaria",
      ],
      transporte: [
        "uber",
        "taxi",
        "ônibus",
        "metro",
        "gasolina",
        "combustível",
        "estacionamento",
      ],
      saúde: [
        "médico",
        "hospital",
        "clínica",
        "exame",
        "consulta",
        "medicamento",
      ],
      educação: ["curso", "livro", "escola", "universidade", "material"],
      lazer: ["cinema", "teatro", "show", "festa", "viagem", "hotel"],
      moradia: ["aluguel", "condomínio", "luz", "água", "gás", "internet"],
      vestuário: ["roupa", "calçado", "loja", "shopping"],
      serviços: ["manutenção", "reparo", "serviço", "conserto"],
      supermercado: ["supermercado", "mercado", "açougue", "padaria"],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => textLower.includes(keyword))) {
        return category;
      }
    }

    return "outros";
  }

  private calculateConfidence(
    expenses: Array<{
      description: string;
      amount: number;
      category: string;
      currency: string;
      confidence: number;
    }>
  ): number {
    if (expenses.length === 0) return 0;

    const avgConfidence =
      expenses.reduce((sum, expense) => sum + expense.confidence, 0) /
      expenses.length;
    return Math.round(avgConfidence * 100) / 100;
  }
}
