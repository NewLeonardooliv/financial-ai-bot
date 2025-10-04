import { logger } from "../utils/logger";
import { db } from "../db/config";
import { users, type User, type NewUser } from "../db/schema";
import { eq } from "drizzle-orm";

export interface CreateUserRequest {
  whatsappNumber: string;
  name?: string;
}

export interface UpdateUserRequest {
  name?: string;
}

export class UserService {
  constructor() {
    logger.info("UserService initialized");
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const existingUser = await this.getUserByWhatsAppNumber(data.whatsappNumber);

    if (existingUser) {
      logger.info("User already exists", { whatsappNumber: data.whatsappNumber });
      return existingUser;
    }

    const newUser: NewUser = {
      whatsappNumber: data.whatsappNumber,
      name: data.name || null,
    };

    const [user] = await db.insert(users).values(newUser).returning();

    logger.info("User created", {
      id: user.id,
      whatsappNumber: user.whatsappNumber,
      name: user.name,
    });

    return user;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      logger.warn("User not found", { id });
      return null;
    }

    logger.info("User retrieved by ID", { id });
    return user;
  }

  async getUserByWhatsAppNumber(whatsappNumber: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.whatsappNumber, whatsappNumber));

    if (!user) {
      logger.warn("User not found", { whatsappNumber });
      return null;
    }

    logger.info("User retrieved by WhatsApp number", { whatsappNumber });
    return user;
  }

  async updateUser(id: number, data: UpdateUserRequest): Promise<User | null> {
    const existingUser = await this.getUserById(id);
    
    if (!existingUser) {
      logger.warn("User not found for update", { id });
      return null;
    }

    const updateData: Partial<NewUser> = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    logger.info("User updated", {
      id: updatedUser.id,
      changes: data,
    });

    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const existingUser = await this.getUserById(id);
    
    if (!existingUser) {
      logger.warn("User not found for deletion", { id });
      return false;
    }

    await db.delete(users).where(eq(users.id, id));

    logger.info("User deleted", {
      id: existingUser.id,
      whatsappNumber: existingUser.whatsappNumber,
    });

    return true;
  }

  async getAllUsers(): Promise<User[]> {
    const usersList = await db.select().from(users);

    logger.info("All users retrieved", { count: usersList.length });
    return usersList;
  }
}

export const userService = new UserService();
