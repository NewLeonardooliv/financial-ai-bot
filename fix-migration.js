import { db } from './src/db/config';
import { sql } from 'drizzle-orm';

async function fixMigrationIssue() {
  try {
    console.log('🔍 Verificando estado atual do banco...');
    
    // Verificar se a tabela users existe
    const usersTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('Tabela users existe:', usersTableExists[0]?.exists);
    
    // Verificar dados na tabela expenses
    const expensesData = await db.execute(sql`
      SELECT id, user_id, description, amount 
      FROM expenses 
      LIMIT 5;
    `);
    
    console.log('Dados na tabela expenses:', expensesData);
    
    // Se a tabela users não existe, vamos criá-la primeiro
    if (!usersTableExists[0]?.exists) {
      console.log('📝 Criando tabela users...');
      await db.execute(sql`
        CREATE TABLE "users" (
          "id" serial PRIMARY KEY NOT NULL,
          "whatsapp_number" varchar(20) NOT NULL,
          "name" varchar(100),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "users_whatsapp_number_unique" UNIQUE("whatsapp_number")
        );
      `);
      console.log('✅ Tabela users criada!');
    }
    
    // Verificar se há dados na tabela expenses
    const expensesCount = await db.execute(sql`SELECT COUNT(*) as count FROM expenses;`);
    const count = expensesCount[0]?.count || 0;
    
    if (count > 0) {
      console.log(`📊 Encontradas ${count} despesas na tabela expenses`);
      
      // Criar um usuário padrão para as despesas existentes
      console.log('👤 Criando usuário padrão para despesas existentes...');
      const defaultUser = await db.execute(sql`
        INSERT INTO users (whatsapp_number, name) 
        VALUES ('+5511999999999', 'Usuário Padrão') 
        ON CONFLICT (whatsapp_number) DO NOTHING
        RETURNING id;
      `);
      
      const userId = defaultUser[0]?.id;
      console.log('✅ Usuário padrão criado com ID:', userId);
      
      // Atualizar todas as despesas para usar o usuário padrão
      if (userId) {
        console.log('🔄 Atualizando despesas para usar o usuário padrão...');
        await db.execute(sql`
          UPDATE expenses 
          SET user_id = ${userId} 
          WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM users);
        `);
        console.log('✅ Despesas atualizadas!');
      }
    }
    
    // Agora vamos adicionar a coluna user_id se ela não existir
    console.log('🔧 Verificando se a coluna user_id existe...');
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'user_id'
      );
    `);
    
    if (!columnExists[0]?.exists) {
      console.log('📝 Adicionando coluna user_id...');
      await db.execute(sql`ALTER TABLE "expenses" ADD COLUMN "user_id" serial NOT NULL;`);
      console.log('✅ Coluna user_id adicionada!');
    }
    
    // Finalmente, adicionar a foreign key constraint
    console.log('🔗 Adicionando foreign key constraint...');
    try {
      await db.execute(sql`
        ALTER TABLE "expenses" 
        ADD CONSTRAINT "expenses_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
        ON DELETE cascade ON UPDATE no action;
      `);
      console.log('✅ Foreign key constraint adicionada!');
    } catch (error) {
      console.log('⚠️ Foreign key constraint já existe ou houve erro:', error.message);
    }
    
    console.log('🎉 Migração corrigida com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    process.exit(0);
  }
}

fixMigrationIssue();
