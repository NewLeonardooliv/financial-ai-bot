import { Elysia } from "elysia";

export const healthRoutes = new Elysia({ prefix: "/health" }).get(
  "/",
  async () => {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      bun: {
        version: Bun.version,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
    };
  }
);
