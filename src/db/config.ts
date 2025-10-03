import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '../utils/logger';

// Configuração da conexão com PostgreSQL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Criar conexão com PostgreSQL
const sql = postgres(connectionString, {
  max: 10, // máximo de conexões no pool
  idle_timeout: 20, // timeout para conexões idle
  connect_timeout: 10, // timeout para conexão
});

// Criar instância do Drizzle
export const db = drizzle(sql);

// Função para testar a conexão
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}

// Função para fechar conexões
export async function closeConnection(): Promise<void> {
  try {
    await sql.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', { error });
  }
}
