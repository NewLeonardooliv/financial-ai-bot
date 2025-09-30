import { randomUUID } from "crypto";

export function generateSessionId(): string {
  return randomUUID();
}

export function generateTimestampSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidSessionId(sessionId: string): boolean {
  return typeof sessionId === "string" && sessionId.length > 0;
}
