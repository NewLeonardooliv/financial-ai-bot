CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"whatsapp_number" varchar(20) NOT NULL,
	"name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_whatsapp_number_unique" UNIQUE("whatsapp_number")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "user_id" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;