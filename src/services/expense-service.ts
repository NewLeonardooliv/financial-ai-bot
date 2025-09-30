import { logger } from "../utils/logger";
import { ValidationError } from "../middleware/error-handler";
import { Expense } from "./agent-service";
import { normalizeExpenseCategory, isValidExpenseCategory, getValidExpenseCategories } from "../constants/expense-categories";

export interface ExpenseRecord extends Expense {
  id: string;
  createdAt: string;
  updatedAt: string;
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
  private expenses: Map<string, ExpenseRecord> = new Map();
  private nextId = 1;

  constructor() {
    logger.info("ExpenseService initialized");
  }

  async createExpense(data: CreateExpenseRequest): Promise<ExpenseRecord> {
    this.validateExpenseData(data);

    const id = this.nextId.toString();
    this.nextId++;

    // Normalizar categoria para garantir consistência
    const normalizedCategory = normalizeExpenseCategory(data.category);

    const expense: ExpenseRecord = {
      id,
      description: data.description,
      amount: data.amount,
      category: normalizedCategory,
      currency: data.currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.expenses.set(id, expense);

    logger.info("Expense created", {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      currency: expense.currency,
    });

    return expense;
  }

  async getExpense(id: string): Promise<ExpenseRecord | null> {
    const expense = this.expenses.get(id);
    
    if (!expense) {
      logger.warn("Expense not found", { id });
      return null;
    }

    logger.info("Expense retrieved", { id });
    return expense;
  }

  async getAllExpenses(query: ExpenseQuery = {}): Promise<ExpenseRecord[]> {
    let filteredExpenses = Array.from(this.expenses.values());

    // Filter by category
    if (query.category) {
      filteredExpenses = filteredExpenses.filter(
        expense => expense.category.toLowerCase() === query.category!.toLowerCase()
      );
    }

    // Filter by currency
    if (query.currency) {
      filteredExpenses = filteredExpenses.filter(
        expense => expense.currency.toLowerCase() === query.currency!.toLowerCase()
      );
    }

    // Filter by date range
    if (query.startDate) {
      filteredExpenses = filteredExpenses.filter(
        expense => expense.createdAt >= query.startDate!
      );
    }

    if (query.endDate) {
      filteredExpenses = filteredExpenses.filter(
        expense => expense.createdAt <= query.endDate!
      );
    }

    // Sort by creation date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedExpenses = filteredExpenses.slice(offset, offset + limit);

    logger.info("Expenses retrieved", {
      total: filteredExpenses.length,
      returned: paginatedExpenses.length,
      filters: query,
    });

    return paginatedExpenses;
  }

  async updateExpense(id: string, data: UpdateExpenseRequest): Promise<ExpenseRecord | null> {
    const existingExpense = this.expenses.get(id);
    
    if (!existingExpense) {
      logger.warn("Expense not found for update", { id });
      return null;
    }

    // Validate data if provided
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
      
      // Validar se a categoria é válida
      if (!isValidExpenseCategory(data.category)) {
        throw new ValidationError(
          `Invalid category: "${data.category}". Valid categories: ${getValidExpenseCategories().join(", ")}`
        );
      }
    }

    if (data.currency !== undefined) {
      if (!data.currency || data.currency.trim().length === 0) {
        throw new ValidationError("Currency cannot be empty");
      }
    }

    // Normalizar categoria se fornecida
    const normalizedData = { ...data };
    if (data.category !== undefined) {
      normalizedData.category = normalizeExpenseCategory(data.category);
    }

    const updatedExpense: ExpenseRecord = {
      ...existingExpense,
      ...normalizedData,
      updatedAt: new Date().toISOString(),
    };

    this.expenses.set(id, updatedExpense);

    logger.info("Expense updated", {
      id: updatedExpense.id,
      changes: data,
    });

    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const expense = this.expenses.get(id);
    
    if (!expense) {
      logger.warn("Expense not found for deletion", { id });
      return false;
    }

    this.expenses.delete(id);

    logger.info("Expense deleted", {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
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
    const expenses = await this.getAllExpenses(query);

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categories = [...new Set(expenses.map(expense => expense.category))];
    const currencies = [...new Set(expenses.map(expense => expense.currency))];
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
      throw new ValidationError("Amount is required and must be greater than 0");
    }

    if (!data.category || data.category.trim().length === 0) {
      throw new ValidationError("Category is required and cannot be empty");
    }

    // Validar se a categoria é válida
    if (!isValidExpenseCategory(data.category)) {
      throw new ValidationError(
        `Invalid category: "${data.category}". Valid categories: ${getValidExpenseCategories().join(", ")}`
      );
    }

    if (!data.currency || data.currency.trim().length === 0) {
      throw new ValidationError("Currency is required and cannot be empty");
    }
  }
}

export const expenseService = new ExpenseService();
