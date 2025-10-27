import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

// Walidacja enumów
export const PlatformRole = {
  USER: 'USER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN'
} as const;

export type PlatformRoleType = typeof PlatformRole[keyof typeof PlatformRole];

// Schematy walidacji
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  platformRole: z.enum(['USER', 'PLATFORM_ADMIN']).default('USER'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  displayName: z.string().min(1, 'Display name is required').optional(),
  platformRole: z.enum(['USER', 'PLATFORM_ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export class UserService {
  /**
   * Tworzy nowego użytkownika
   */
  static async createUser(data: CreateUserData) {
    try {
      // Walidacja danych
      const validatedData = createUserSchema.parse(data);

      // Sprawdź czy użytkownik już istnieje
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash hasła
      const passwordHash = await bcrypt.hash(validatedData.password, 12);

      // Utwórz użytkownika
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          displayName: validatedData.displayName,
          passwordHash,
          platformRole: validatedData.platformRole,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isActive: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      // NAPRAWIONE: Lepsze przekazywanie błędów z kontekstem
      if (error instanceof Error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }
      throw new Error('Failed to create user: Unknown error');
    }
  }

  /**
   * Pobiera użytkownika po ID
   */
  static async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      // NAPRAWIONE: Lepsze przekazywanie błędów
      if (error instanceof Error && error.message === 'User not found') {
        throw error; // Przekaż błąd biznesowy bez zmian
      }
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pobiera użytkownika po emailu
   */
  static async getUserByEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      // NAPRAWIONE: Lepsze przekazywanie błędów
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pobiera listę użytkowników z paginacją i filtrowaniem
   */
  static async getUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    platformRole?: PlatformRoleType;
    isActive?: boolean;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        platformRole,
        isActive,
      } = options;

      const skip = (page - 1) * limit;

      // Buduj warunki where
      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (platformRole) {
        where.platformRole = platformRole;
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }

      // Pobierz użytkowników i liczbę
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            displayName: true,
            platformRole: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      // NAPRAWIONE: Lepsze przekazywanie błędów
      throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // NAPRAWIONE: Podobne poprawki dla pozostałych metod
  static async updateUser(id: string, data: UpdateUserData) {
    try {
      const validatedData = updateUserSchema.parse(data);

      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Sprawdź czy email nie jest zajęty przez innego użytkownika
      if (validatedData.email && validatedData.email !== existingUser.email) {
        const emailTaken = await prisma.user.findUnique({
          where: { email: validatedData.email },
        });

        if (emailTaken) {
          throw new Error('Email is already taken by another user');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: validatedData,
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof Error && (error.message === 'User not found' || error.message === 'Email is already taken by another user')) {
        throw error;
      }
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async changePassword(id: string, data: ChangePasswordData) {
    try {
      const validatedData = changePasswordSchema.parse(data);

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Sprawdź obecne hasło
      if (user.passwordHash) {
        const isCurrentPasswordValid = await bcrypt.compare(
          validatedData.currentPassword,
          user.passwordHash
        );

        if (!isCurrentPasswordValid) {
          throw new Error('Current password is incorrect');
        }
      }

      // Hash nowego hasła
      const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 12);

      await prisma.user.update({
        where: { id },
        data: { passwordHash: newPasswordHash },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof Error && (error.message === 'User not found' || error.message === 'Current password is incorrect')) {
        throw error;
      }
      throw new Error(`Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deactivateUser(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error(`Failed to deactivate user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deleteUser(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prisma.user.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getUserStats() {
    try {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      const adminUsers = await prisma.user.count({ where: { platformRole: 'PLATFORM_ADMIN' } });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsersLast30Days = await prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      return {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        newLast30Days: newUsersLast30Days,
      };
    } catch (error) {
      throw new Error(`Failed to get user stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async verifyPassword(email: string, password: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, passwordHash: true, isActive: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.passwordHash) {
        throw new Error('Invalid password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      return { userId: user.id, isActive: user.isActive };
    } catch (error) {
      if (error instanceof Error && (error.message === 'User not found' || error.message === 'Invalid password')) {
        throw error;
      }
      throw new Error(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}