import { logger } from "../utils/logger";
import { Elysia } from "elysia";
import {
  expenseService,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseQuery,
} from "../services/expense-service";

export const expenseRoutes = new Elysia({ prefix: "/expenses" })
  .post(
    "/",
    async ({ set, body }) => {
      try {
        const expenseData = body as CreateExpenseRequest;

        logger.info("Creating new expense", { expenseData });

        const expense = await expenseService.createExpense(expenseData);

        set.status = 201;
        return {
          success: true,
          message: "Expense created successfully",
          data: expense,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to create expense", {
          error: error instanceof Error ? error.message : "Unknown error",
          body,
        });

        set.status = 400;
        return {
          success: false,
          message: "Failed to create expense",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Expenses"],
        summary: "Create a new expense",
        description: "Creates a new expense record",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["description", "amount", "category", "currency"],
                properties: {
                  description: {
                    type: "string",
                    example: "Coffee at Starbucks",
                  },
                  amount: { type: "number", example: 5.5 },
                  category: { type: "string", example: "Food & Drinks" },
                  currency: { type: "string", example: "USD" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Expense created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        description: { type: "string" },
                        amount: { type: "number" },
                        category: { type: "string" },
                        currency: { type: "string" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                      },
                    },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
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
  )

  .get(
    "/",
    async ({ query }) => {
      try {
        const queryParams = query as ExpenseQuery;

        logger.info("Retrieving expenses", { queryParams });

        const expenses = await expenseService.getAllExpenses(queryParams);

        return {
          success: true,
          message: "Expenses retrieved successfully",
          data: expenses,
          count: expenses.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to retrieve expenses", {
          error: error instanceof Error ? error.message : "Unknown error",
          query,
        });

        return {
          success: false,
          message: "Failed to retrieve expenses",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Expenses"],
        summary: "Get all expenses",
        description:
          "Retrieves all expenses with optional filtering and pagination",
        responses: {
          200: {
            description: "Expenses retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          description: { type: "string" },
                          amount: { type: "number" },
                          category: { type: "string" },
                          currency: { type: "string" },
                          createdAt: { type: "string" },
                          updatedAt: { type: "string" },
                        },
                      },
                    },
                    count: { type: "number" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const { id } = params;

        logger.info("Retrieving expense by ID", { id });

        const expense = await expenseService.getExpense(id);

        if (!expense) {
          set.status = 404;
          return {
            success: false,
            message: "Expense not found",
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          message: "Expense retrieved successfully",
          data: expense,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to retrieve expense", {
          error: error instanceof Error ? error.message : "Unknown error",
          id: params.id,
        });

        set.status = 500;
        return {
          success: false,
          message: "Failed to retrieve expense",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Expenses"],
        summary: "Get expense by ID",
        description: "Retrieves a specific expense by its ID",
        responses: {
          200: {
            description: "Expense retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        description: { type: "string" },
                        amount: { type: "number" },
                        category: { type: "string" },
                        currency: { type: "string" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                      },
                    },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
          404: {
            description: "Expense not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  .put(
    "/:id",
    async ({ params, set, body }) => {
      try {
        const { id } = params;
        const updateData = body as UpdateExpenseRequest;

        logger.info("Updating expense", { id, updateData });

        const expense = await expenseService.updateExpense(id, updateData);

        if (!expense) {
          set.status = 404;
          return {
            success: false,
            message: "Expense not found",
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          message: "Expense updated successfully",
          data: expense,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to update expense", {
          error: error instanceof Error ? error.message : "Unknown error",
          id: params.id,
          body,
        });

        set.status = 400;
        return {
          success: false,
          message: "Failed to update expense",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Expenses"],
        summary: "Update expense",
        description: "Updates an existing expense",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                    example: "Updated coffee description",
                  },
                  amount: { type: "number", example: 6.0 },
                  category: { type: "string", example: "Food & Drinks" },
                  currency: { type: "string", example: "USD" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Expense updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        description: { type: "string" },
                        amount: { type: "number" },
                        category: { type: "string" },
                        currency: { type: "string" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                      },
                    },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
          404: {
            description: "Expense not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const { id } = params;

        logger.info("Deleting expense", { id });

        const deleted = await expenseService.deleteExpense(id);

        if (!deleted) {
          set.status = 404;
          return {
            success: false,
            message: "Expense not found",
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          message: "Expense deleted successfully",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to delete expense", {
          error: error instanceof Error ? error.message : "Unknown error",
          id: params.id,
        });

        set.status = 500;
        return {
          success: false,
          message: "Failed to delete expense",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Expenses"],
        summary: "Delete expense",
        description: "Deletes an expense by its ID",
        responses: {
          200: {
            description: "Expense deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
          404: {
            description: "Expense not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }
  )

  .get(
    "/summary",
    async ({ query }) => {
      try {
        const queryParams = query as ExpenseQuery;

        logger.info("Generating expense summary", { queryParams });

        const summary = await expenseService.getExpenseSummary(queryParams);

        return {
          success: true,
          message: "Expense summary generated successfully",
          data: summary,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to generate expense summary", {
          error: error instanceof Error ? error.message : "Unknown error",
          query,
        });

        return {
          success: false,
          message: "Failed to generate expense summary",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Expenses"],
        summary: "Get expense summary",
        description: "Generates a summary of expenses with statistics",
        responses: {
          200: {
            description: "Expense summary generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        totalExpenses: { type: "number" },
                        totalAmount: { type: "number" },
                        categories: {
                          type: "array",
                          items: { type: "string" },
                        },
                        currencies: {
                          type: "array",
                          items: { type: "string" },
                        },
                        averageAmount: { type: "number" },
                      },
                    },
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

export const categoryRoutes = new Elysia({ prefix: "/categories" }).get(
  "/",
  async () => {
    try {
      logger.info("Retrieving valid expense categories");

      const categories = await expenseService.getValidCategories();

      return {
        success: true,
        message: "Valid categories retrieved successfully",
        data: categories,
        count: categories.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to retrieve valid categories", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        message: "Failed to retrieve valid categories",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
  {
    detail: {
      tags: ["Expenses"],
      summary: "Get valid expense categories",
      description: "Retrieves all valid expense categories",
      responses: {
        200: {
          description: "Valid categories retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  data: {
                    type: "array",
                    items: { type: "string" },
                  },
                  count: { type: "number" },
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
