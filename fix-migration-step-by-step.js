import { db } from './src/db/config';
import { sql } from 'drizzle-orm';

async function fixMigrationStepByStep() {
  try {
    console.log('🔍 Verificando estado atual do banco...');
    
    // 1. Verificar se a tabela users existe
    const usersTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('Tabela users existe:', usersTableExists[0]?.exists);
    
    // 2. Se não existe, criar a tabela users
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
    
    // 3. Verificar dados na tabela expenses (sem user_id)
    const expensesData = await db.execute(sql`
      SELECT id, description, amount 
      FROM expenses 
      LIMIT 5;
    `);
    
    console.log('Dados na tabela expenses:', expensesData);
    
    // 4. Criar usuário padrão
    console.log('👤 Criando usuário padrão...');
    const defaultUser = await db.execute(sql`
      INSERT INTO users (whatsapp_number, name) 
      VALUES ('+5511999999999', 'Usuário Padrão') 
      ON CONFLICT (whatsapp_number) DO NOTHING
      RETURNING id;
    `);
    
    const userId = defaultUser[0]?.id;
    console.log('✅ Usuário padrão criado com ID:', userId);
    
    // 5. Adicionar coluna user_id com valor padrão
    console.log('📝 Adicionando coluna user_id...');
    await db.execute(sql`ALTER TABLE "expenses" ADD COLUMN "user_id" integer;`);
    console.log('✅ Coluna user_id adicionada!');
    
    // 6. Atualizar todas as despesas para usar o usuário padrão
    if (userId) {
      console.log('🔄 Atualizando despesas para usar o usuário padrão...');
      await db.execute(sql`UPDATE expenses SET user_id = ${userId};`);
      console.log('✅ Despesas atualizadas!');
    }
    
    // 7. Tornar a coluna user_id NOT NULL
    console.log('🔧 Tornando user_id NOT NULL...');
    await db.execute(sql`ALTER TABLE "expenses" ALTER COLUMN "user_id" SET NOT NULL;`);
    console.log('✅ Coluna user_id agora é NOT NULL!');
    
    // 8. Adicionar foreign key constraint
    console.log('🔗 Adicionando foreign key constraint...');
    await db.execute(sql`
      ALTER TABLE "expenses" 
      ADD CONSTRAINT "expenses_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
      ON DELETE cascade ON UPDATE no action;
    `);
    console.log('✅ Foreign key constraint adicionada!');
    
    console.log('🎉 Migração corrigida com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    process.exit(0);
  }
}

fixMigrationStepByStep();
