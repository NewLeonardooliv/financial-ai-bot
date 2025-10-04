-- Migration to convert from serial to UUID
-- Step 1: Add new UUID columns
ALTER TABLE "users" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();
ALTER TABLE "expenses" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();
ALTER TABLE "expenses" ADD COLUMN "user_id_new" uuid;

-- Step 2: Update foreign key references
UPDATE "expenses" SET "user_id_new" = (
  SELECT "id_new" FROM "users" WHERE "users"."id" = "expenses"."user_id"
);

-- Step 3: Drop foreign key constraint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_user_id_users_id_fk";

-- Step 4: Drop old columns
ALTER TABLE "expenses" DROP COLUMN "id";
ALTER TABLE "expenses" DROP COLUMN "user_id";
ALTER TABLE "users" DROP COLUMN "id";

-- Step 5: Rename new columns to original names
ALTER TABLE "users" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "expenses" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "expenses" RENAME COLUMN "user_id_new" TO "user_id";

-- Step 6: Add primary key constraints
ALTER TABLE "users" ADD PRIMARY KEY ("id");
ALTER TABLE "expenses" ADD PRIMARY KEY ("id");

-- Step 7: Add foreign key constraint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Step 8: Make columns NOT NULL
ALTER TABLE "expenses" ALTER COLUMN "user_id" SET NOT NULL;