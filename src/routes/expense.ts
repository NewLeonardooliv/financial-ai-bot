import { logger } from "../utils/logger";
import { Elysia } from "elysia";
import {
  expenseService,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseQuery,
} from "../services/expense-service";
import { authMiddleware, getUserFromContext } from "../middleware/auth";

export const expenseRoutes = new Elysia({ prefix: "/expenses" })
  .use(authMiddleware())
  .post(
    "/",
    async ({ set, body, request }) => {
      try {
        const user = getUserFromContext(request);
        const expenseData = body as CreateExpenseRequest;

        logger.info("Creating new expense", { expenseData, userId: user.id });

        const expense = await expenseService.createExpense(expenseData, user);

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
      },
    }
  )

  .get(
    "/",
    async ({ query, request }) => {
      try {
        const user = getUserFromContext(request);
        const queryParams = query as ExpenseQuery;

        logger.info("Retrieving expenses", { queryParams, userId: user.id });

        const expenses = await expenseService.getAllExpenses(user, queryParams);

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
      },
    }
  )

  .get(
    "/:id",
    async ({ params, set, request }) => {
      try {
        const user = getUserFromContext(request);
        const { id } = params;
        const expenseId = id;

        logger.info("Retrieving expense by ID", {
          id: expenseId,
          userId: user.id,
        });

        const expense = await expenseService.getExpense(expenseId, user);

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
      },
    }
  )

  .put(
    "/:id",
    async ({ params, set, body, request }) => {
      try {
        const user = getUserFromContext(request);
        const { id } = params;
        const expenseId = id;
        const updateData = body as UpdateExpenseRequest;

        logger.info("Updating expense", {
          id: expenseId,
          updateData,
          userId: user.id,
        });

        const expense = await expenseService.updateExpense(
          expenseId,
          updateData,
          user
        );

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
      },
    }
  )

  .delete(
    "/:id",
    async ({ params, set, request }) => {
      try {
        const user = getUserFromContext(request);
        const { id } = params;
        const expenseId = id;

        logger.info("Deleting expense", { id: expenseId, userId: user.id });

        const deleted = await expenseService.deleteExpense(expenseId, user);

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
      },
    }
  )

  .get(
    "/summary",
    async ({ query, request }) => {
      try {
        const user = getUserFromContext(request);
        const queryParams = query as ExpenseQuery;

        logger.info("Generating expense summary", {
          queryParams,
          userId: user.id,
        });

        const summary = await expenseService.getExpenseSummary(
          user,
          queryParams
        );

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
    },
  }
);
