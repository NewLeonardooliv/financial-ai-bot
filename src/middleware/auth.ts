import { logger } from "../utils/logger";
import { userService } from "../services/user-service";
import { Elysia } from "elysia";

export interface AuthenticatedUser {
  id: string;
  whatsappNumber: string;
  name?: string | null;
}

export interface AuthContext {
  user: AuthenticatedUser;
}

export const authMiddleware = new Elysia().onRequest(
  async ({ request, set }: any) => {
    try {
      const authHeader = request.headers.get("authorization");

      if (!authHeader) {
        logger.warn("No authorization header provided");
        set.status = 401;
        return {
          message: "Authorization header required",
          timestamp: new Date().toISOString(),
        };
      }

      const token = authHeader.replace("Bearer ", "");

      if (!token.startsWith("whatsapp:")) {
        logger.warn("Invalid token format", {
          token: token.substring(0, 20),
        });
        set.status = 401;
        return {
          message: "Invalid token format. Expected: whatsapp:+5511999999999",
          timestamp: new Date().toISOString(),
        };
      }

      const whatsappNumber = token.replace("whatsapp:", "");

      let user = await userService.getUserByWhatsAppNumber(whatsappNumber);

      if (!user) {
        user = await userService.createUser({
          whatsappNumber,
          name: undefined,
        });
        logger.info("User created automatically", { whatsappNumber });
      }

      request.user = {
        id: user.id,
        whatsappNumber: user.whatsappNumber,
        name: user.name,
      };

      logger.info("User authenticated", {
        userId: user.id,
        whatsappNumber: user.whatsappNumber,
      });

      return undefined;
    } catch (error) {
      logger.error("Authentication error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      set.status = 401;
      return {
        message: "Authentication failed",
        timestamp: new Date().toISOString(),
      };
    }
  }
);

export function getUserFromContext(request: any): AuthenticatedUser {
  return request.user;
}

export function extractWhatsAppNumberFromWebhook(
  webhookData: any
): string | null {
  try {
    const remoteJid = webhookData?.data?.key?.remoteJid;

    if (!remoteJid) {
      logger.warn("No remoteJid found in webhook data");
      return null;
    }

    const whatsappNumber = remoteJid.split("@")[0];

    logger.info("WhatsApp number extracted from webhook", { whatsappNumber });
    return whatsappNumber;
  } catch (error) {
    logger.error("Error extracting WhatsApp number from webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}
