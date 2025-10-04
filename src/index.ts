import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { logger } from "./utils/logger";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health";
import { webhookRoutes } from "./routes/webhook";
import { expenseRoutes, categoryRoutes } from "./routes/expense";
import { testConnection } from "./db/config";

async function initializeDatabase() {
  const isConnected = await testConnection();
  if (!isConnected) {
    logger.error(
      "Failed to connect to database. Application may not work correctly."
    );
    process.exit(1);
  }
}

initializeDatabase().catch((error) => {
  logger.error("Database initialization failed", { error });
  process.exit(1);
});

const app = new Elysia()
  .use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  )

  .use(rateLimitMiddleware)

  .use(
    swagger({
      documentation: {
        info: {
          title: "Financial AI Bot API",
          version: "1.0.0",
          description: "High-performance API built with Bun and Elysia",
        },
        tags: [
          { name: "Health", description: "Health check endpoints" },
          {
            name: "Webhook",
            description: "Evolution API webhook processing endpoints",
          },
          { name: "Expenses", description: "Expense management endpoints" },
        ],
      },
    })
  )

  .onRequest(({ request }) => {
    logger.info("Incoming request", {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
  })

  .onError(errorHandler)

  .use(healthRoutes)
  .use(webhookRoutes)
  .use(expenseRoutes)
  .use(categoryRoutes)

  .onBeforeHandle(({ request }) => {
    request.headers.set("x-start-time", Date.now().toString());
  })

  .onAfterHandle(({ set }) => {
    if (set.status === 404) {
      set.status = 404;
      return {
        error: "Not Found",
        message: "The requested resource was not found",
        timestamp: new Date().toISOString(),
      };
    }
  });

export default app;
