import { pgTable, serial, text, decimal, timestamp, varchar, uuid, integer } from 'drizzle-orm/pg-core';

// Schema para a tabela de usuários
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Schema para a tabela de expenses (atualizado com user_id)
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tipos TypeScript baseados nos schemas
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
