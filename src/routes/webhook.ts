import { logger } from "../utils/logger";
import { Elysia } from "elysia";
import { agentService } from "../services/agent-service";
import { evolutionService } from "../services/evolution-service";

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

      const agentResponse = await agentService.extractExpenses(messageText);

      logger.info("Expense extraction completed", {
        success: agentResponse.success,
        expensesCount: agentResponse.data.expenses.length,
        totalAmount: agentResponse.data.summary.totalAmount,
        requestId: agentResponse.requestId,
      });

      if (agentResponse.success && agentResponse.data.expenses.length > 0) {
        try {
          const remoteJid = webhookData.data.key?.remoteJid;
          if (remoteJid) {
            const phoneNumber = remoteJid.split("@")[0];

            const formattedResponse = evolutionService.formatExpenseResponse(
              agentResponse.data.expenses
            );

            await evolutionService.sendMessage(phoneNumber, formattedResponse);

            logger.info("Formatted response sent successfully", {
              phoneNumber,
              expensesCount: agentResponse.data.expenses.length,
              totalAmount: agentResponse.data.summary.totalAmount,
              categories: agentResponse.data.summary.categories,
            });
          }
        } catch (error) {
          logger.error("Failed to send formatted response", {
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
