import { logger } from "../utils/logger";
import { ValidationError } from "../middleware/error-handler";
import { Expense } from "./agent-service";
import {
  normalizeExpenseCategory,
  isValidExpenseCategory,
  getValidExpenseCategories,
} from "../constants/expense-categories";
import { db } from "../db/config";
import {
  expenses,
  type Expense as DbExpense,
  type NewExpense,
} from "../db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface ExpenseRecord extends Expense {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  category: string;
  currency: string;
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  category?: string;
  currency?: string;
}

export interface ExpenseQuery {
  category?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class ExpenseService {
  constructor() {
    logger.info("ExpenseService initialized with PostgreSQL");
  }

  async createExpense(data: CreateExpenseRequest): Promise<ExpenseRecord> {
    this.validateExpenseData(data);

    const normalizedCategory = normalizeExpenseCategory(data.category);

    const newExpense: NewExpense = {
      description: data.description,
      amount: data.amount.toString(),
      category: normalizedCategory,
      currency: data.currency,
    };

    const [expense] = await db.insert(expenses).values(newExpense).returning();

    logger.info("Expense created", {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      currency: expense.currency,
    });

    return this.mapDbExpenseToRecord(expense);
  }

  async getExpense(id: number): Promise<ExpenseRecord | null> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));

    if (!expense) {
      logger.warn("Expense not found", { id });
      return null;
    }

    logger.info("Expense retrieved", { id });
    return this.mapDbExpenseToRecord(expense);
  }

  async getAllExpenses(query: ExpenseQuery = {}): Promise<ExpenseRecord[]> {
    const conditions = [];

    if (query.category) {
      conditions.push(eq(expenses.category, query.category));
    }

    if (query.currency) {
      conditions.push(eq(expenses.currency, query.currency));
    }

    if (query.startDate) {
      conditions.push(gte(expenses.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(expenses.createdAt, new Date(query.endDate)));
    }

    const dbExpenses = await db
      .select()
      .from(expenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(expenses.createdAt))
      .limit(query.limit || 100)
      .offset(query.offset || 0);

    const expensesList = dbExpenses.map((expense) =>
      this.mapDbExpenseToRecord(expense)
    );

    logger.info("Expenses retrieved", {
      total: expensesList.length,
      filters: query,
    });

    return expensesList;
  }

  async updateExpense(
    id: number,
    data: UpdateExpenseRequest
  ): Promise<ExpenseRecord | null> {
    const existingExpense = await this.getExpense(id);

    if (!existingExpense) {
      logger.warn("Expense not found for update", { id });
      return null;
    }

    if (data.description !== undefined) {
      if (!data.description || data.description.trim().length === 0) {
        throw new ValidationError("Description cannot be empty");
      }
    }

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new ValidationError("Amount must be greater than 0");
      }
    }

    if (data.category !== undefined) {
      if (!data.category || data.category.trim().length === 0) {
        throw new ValidationError("Category cannot be empty");
      }

      if (!isValidExpenseCategory(data.category)) {
        throw new ValidationError(
          `Invalid category: "${
            data.category
          }". Valid categories: ${getValidExpenseCategories().join(", ")}`
        );
      }
    }

    if (data.currency !== undefined) {
      if (!data.currency || data.currency.trim().length === 0) {
        throw new ValidationError("Currency cannot be empty");
      }
    }

    const updateData: Partial<NewExpense> = {};

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.amount !== undefined) {
      updateData.amount = data.amount.toString();
    }

    if (data.category !== undefined) {
      updateData.category = normalizeExpenseCategory(data.category);
    }

    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }

    // Atualizar no banco de dados
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();

    logger.info("Expense updated", {
      id: updatedExpense.id,
      changes: data,
    });

    return this.mapDbExpenseToRecord(updatedExpense);
  }

  async deleteExpense(id: number): Promise<boolean> {
    const existingExpense = await this.getExpense(id);

    if (!existingExpense) {
      logger.warn("Expense not found for deletion", { id });
      return false;
    }

    await db.delete(expenses).where(eq(expenses.id, id));

    logger.info("Expense deleted", {
      id: existingExpense.id,
      description: existingExpense.description,
      amount: existingExpense.amount,
    });

    return true;
  }

  async getExpenseSummary(query: ExpenseQuery = {}): Promise<{
    totalExpenses: number;
    totalAmount: number;
    categories: string[];
    currencies: string[];
    averageAmount: number;
  }> {
    const conditions = [];

    if (query.category) {
      conditions.push(eq(expenses.category, query.category));
    }

    if (query.currency) {
      conditions.push(eq(expenses.currency, query.currency));
    }

    if (query.startDate) {
      conditions.push(gte(expenses.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(expenses.createdAt, new Date(query.endDate)));
    }

    const expensesList = await db
      .select()
      .from(expenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalExpenses = expensesList.length;
    const totalAmount = expensesList.reduce(
      (sum, expense) => sum + parseFloat(expense.amount),
      0
    );
    const categories = [
      ...new Set(expensesList.map((expense) => expense.category)),
    ];
    const currencies = [
      ...new Set(expensesList.map((expense) => expense.currency)),
    ];
    const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    const summary = {
      totalExpenses,
      totalAmount,
      categories,
      currencies,
      averageAmount,
    };

    logger.info("Expense summary generated", summary);

    return summary;
  }

  async getValidCategories(): Promise<string[]> {
    const categories = getValidExpenseCategories();

    logger.info("Valid categories requested", { count: categories.length });

    return [...categories];
  }

  private validateExpenseData(data: CreateExpenseRequest): void {
    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError("Description is required and cannot be empty");
    }

    if (!data.amount || data.amount <= 0) {
      throw new ValidationError(
        "Amount is required and must be greater than 0"
      );
    }

    if (!data.category || data.category.trim().length === 0) {
      throw new ValidationError("Category is required and cannot be empty");
    }

    if (!isValidExpenseCategory(data.category)) {
      throw new ValidationError(
        `Invalid category: "${
          data.category
        }". Valid categories: ${getValidExpenseCategories().join(", ")}`
      );
    }

    if (!data.currency || data.currency.trim().length === 0) {
      throw new ValidationError("Currency is required and cannot be empty");
    }
  }

  private mapDbExpenseToRecord(dbExpense: DbExpense): ExpenseRecord {
    return {
      id: dbExpense.id,
      description: dbExpense.description,
      amount: parseFloat(dbExpense.amount),
      category: dbExpense.category,
      currency: dbExpense.currency,
      createdAt: dbExpense.createdAt,
      updatedAt: dbExpense.updatedAt,
    };
  }
}

export const expenseService = new ExpenseService();
