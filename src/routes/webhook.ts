import { logger } from "../utils/logger";
import { Elysia } from "elysia";
import { agentService } from "../services/agent-service";
import { evolutionService } from "../services/evolution-service";
import { userService } from "../services/user-service";
import { extractWhatsAppNumberFromWebhook } from "../middleware/auth";

interface WebhookMessage {
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
  messageTimestamp?: number;
  pushName?: string;
}

interface WebhookBody {
  data: WebhookMessage;
}

export const webhookRoutes = new Elysia({ prefix: "/webhook" }).post(
  "/evolution-api",
  async ({ set, body }) => {
    try {
      logger.info("Received webhook message", { body });

      const webhookData = body as WebhookBody;

      let messageText = "";

      if (webhookData.data.message?.conversation) {
        messageText = webhookData.data.message.conversation;
      }
      if (webhookData.data.message?.extendedTextMessage?.text) {
        messageText = webhookData.data.message.extendedTextMessage.text;
      }

      if (!messageText) {
        logger.warn("No text content found in message", { webhookData });
        return {
          status: "success",
          message: "No text content to process",
          timestamp: new Date().toISOString(),
        };
      }

      logger.info("Processing message text", {
        text: messageText,
        fromMe: webhookData.data.key?.fromMe,
        remoteJid: webhookData.data.key?.remoteJid,
      });

      if (!webhookData.data.key?.fromMe) {
        logger.info("Skipping message from bot itself");
        return {
          status: "success",
          message: "Message from bot skipped",
          timestamp: new Date().toISOString(),
        };
      }

      const whatsappNumber = extractWhatsAppNumberFromWebhook(webhookData);

      if (!whatsappNumber) {
        logger.warn("Could not extract WhatsApp number from webhook");
        return {
          status: "error",
          message: "Could not extract WhatsApp number",
          timestamp: new Date().toISOString(),
        };
      }

      const user = await userService.createUser({
        whatsappNumber,
        name: webhookData.data.pushName || undefined,
      });

      logger.info("User processed", {
        userId: user.id,
        whatsappNumber: user.whatsappNumber,
        name: user.name,
      });

      const agentResponse = await agentService.extractExpenses(
        messageText,
        user
      );

      logger.info("Expense extraction completed", {
        success: agentResponse.success,
        expensesCount: agentResponse.data.expenses.length,
        totalAmount: agentResponse.data.summary.totalAmount,
        requestId: agentResponse.requestId,
      });

      if (agentResponse.success && agentResponse.data.expenses.length > 0) {
        try {
          const formattedResponse = evolutionService.formatExpenseResponse(
            agentResponse.data.expenses
          );

          await evolutionService.sendMessage(whatsappNumber, formattedResponse);

          logger.info("Formatted response sent successfully", {
            userId: user.id,
            whatsappNumber,
            expensesCount: agentResponse.data.expenses.length,
            totalAmount: agentResponse.data.summary.totalAmount,
            categories: agentResponse.data.summary.categories,
          });
        } catch (error) {
          logger.error("Failed to process user or send response", {
            error: error instanceof Error ? error.message : "Unknown error",
            remoteJid: webhookData.data.key?.remoteJid,
          });
        }
      }

      return {
        status: "success",
        message: "Message processed successfully",
        timestamp: new Date().toISOString(),
        data: {
          originalMessage: messageText,
          extractedExpenses: agentResponse.data,
          agentResponse: agentResponse,
        },
      };
    } catch (error) {
      logger.error("Error processing webhook message", {
        error: error instanceof Error ? error.message : "Unknown error",
        body,
      });

      set.status = 500;
      return {
        status: "error",
        message: "Failed to process message",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
  {
    detail: {
      tags: ["Webhook"],
      summary: "Process Evolution API webhook",
      description:
        "Receives webhook messages from Evolution API and processes them using the expense extractor agent",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                key: {
                  type: "object",
                  properties: {
                    remoteJid: { type: "string" },
                    fromMe: { type: "boolean" },
                    id: { type: "string" },
                  },
                },
                message: {
                  type: "object",
                  properties: {
                    conversation: { type: "string" },
                    extendedTextMessage: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                      },
                    },
                  },
                },
                messageTimestamp: { type: "number" },
                pushName: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Message processed successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  message: { type: "string" },
                  timestamp: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      originalMessage: { type: "string" },
                      extractedExpenses: {
                        type: "object",
                        properties: {
                          expenses: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                description: { type: "string" },
                                amount: { type: "number" },
                                category: { type: "string" },
                                currency: { type: "string" },
                                confidence: { type: "number" },
                              },
                            },
                          },
                          summary: {
                            type: "object",
                            properties: {
                              totalExpenses: { type: "number" },
                              totalAmount: { type: "number" },
                              categories: {
                                type: "array",
                                items: { type: "string" },
                              },
                            },
                          },
                          extractedAt: { type: "string" },
                          confidence: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  message: { type: "string" },
                  error: { type: "string" },
                  timestamp: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  }
);
