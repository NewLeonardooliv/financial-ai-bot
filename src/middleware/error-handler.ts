import { logger } from "../utils/logger";

export const errorHandler = ({ error, set }: any) => {
  logger.error("Unhandled error occurred", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  if (error.name === "ValidationError") {
    set.status = 400;
    return {
      error: "Validation Error",
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  if (error.name === "UnauthorizedError") {
    set.status = 401;
    return {
      error: "Unauthorized",
      message: "Authentication required",
      timestamp: new Date().toISOString(),
    };
  }

  if (error.name === "ForbiddenError") {
    set.status = 403;
    return {
      error: "Forbidden",
      message: "Access denied",
      timestamp: new Date().toISOString(),
    };
  }

  if (error.name === "NotFoundError") {
    set.status = 404;
    return {
      error: "Not Found",
      message: error.message || "Resource not found",
      timestamp: new Date().toISOString(),
    };
  }

  if (error.name === "ConflictError") {
    set.status = 409;
    return {
      error: "Conflict",
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  set.status = 500;
  return {
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  };
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Not Found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
