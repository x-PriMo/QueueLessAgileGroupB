import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Walidacja enumów
export const RegistrationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

export const CompanyCategory = {
  BEAUTY: 'BEAUTY',
  HEALTH: 'HEALTH',
  AUTOMOTIVE: 'AUTOMOTIVE',
  OTHER: 'OTHER'
} as const;

export type RegistrationStatusType = typeof RegistrationStatus[keyof typeof RegistrationStatus];
export type CompanyCategoryType = typeof CompanyCategory[keyof typeof CompanyCategory];

// Schematy walidacji
export const createRegistrationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  companyName: z.string().min(1, 'Company name is required'),
  companySlug: z.string().min(1, 'Company slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  category: z.enum(['BEAUTY', 'HEALTH', 'AUTOMOTIVE', 'OTHER']),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  contactEmail: z.string().email('Invalid email format'),
  description: z.string().optional(),
  businessLicense: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

export const updateRegistrationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').optional(),
  companySlug: z.string().min(1, 'Company slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  category: z.enum(['BEAUTY', 'HEALTH', 'AUTOMOTIVE', 'OTHER']).optional(),
  city: z.string().min(1, 'City is required').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  description: z.string().optional(),
  businessLicense: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

export const processRegistrationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type CreateRegistrationData = z.infer<typeof createRegistrationSchema>;
export type UpdateRegistrationData = z.infer<typeof updateRegistrationSchema>;
export type ProcessRegistrationData = z.infer<typeof processRegistrationSchema>;

export class CompanyRegistrationService {
  /**
   * Tworzy nową rejestrację firmy
   */
  static async createRegistration(data: CreateRegistrationData) {
    try {
      // Walidacja danych
      const validatedData = createRegistrationSchema.parse(data);

      // Sprawdź czy użytkownik istnieje
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Sprawdź czy użytkownik nie ma już oczekującej rejestracji
      const existingRegistration = await prisma.companyRegistration.findFirst({
        where: {
          userId: validatedData.userId,
          status: 'PENDING',
        },
      });

      if (existingRegistration) {
        throw new Error('User already has a pending registration');
      }

      // Sprawdź czy slug nie jest już zajęty
      const existingCompany = await prisma.company.findUnique({
        where: { slug: validatedData.companySlug },
      });

      if (existingCompany) {
        throw new Error('Company slug is already taken');
      }

      const existingSlugRegistration = await prisma.companyRegistration.findFirst({
        where: {
          companySlug: validatedData.companySlug,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingSlugRegistration) {
        throw new Error('Company slug is already taken in pending registrations');
      }

      // Utwórz rejestrację
      const registration = await prisma.companyRegistration.create({
        data: validatedData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return registration;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Pobiera rejestrację po ID
   */
  static async getRegistrationById(id: string) {
    try {
      const registration = await prisma.companyRegistration.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      if (!registration) {
        throw new Error('Registration not found');
      }

      return registration;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera rejestracje użytkownika
   */
  static async getUserRegistrations(userId: string, options: {
    page?: number;
    limit?: number;
    status?: RegistrationStatusType;
  } = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      const [registrations, total] = await Promise.all([
        prisma.companyRegistration.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.companyRegistration.count({ where }),
      ]);

      return {
        registrations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera wszystkie rejestracje (dla adminów)
   */
  static async getAllRegistrations(options: {
    page?: number;
    limit?: number;
    status?: RegistrationStatusType;
    category?: CompanyCategoryType;
    search?: string;
  } = {}) {
    try {
      const { page = 1, limit = 10, status, category, search } = options;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: 'insensitive' } },
          { companySlug: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [registrations, total] = await Promise.all([
        prisma.companyRegistration.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.companyRegistration.count({ where }),
      ]);

      return {
        registrations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera oczekujące rejestracje
   */
  static async getPendingRegistrations(options: {
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const [registrations, total] = await Promise.all([
        prisma.companyRegistration.findMany({
          where: { status: 'PENDING' },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' }, // Najstarsze pierwsze
        }),
        prisma.companyRegistration.count({ where: { status: 'PENDING' } }),
      ]);

      return {
        registrations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje rejestrację (tylko dla oczekujących)
   */
  static async updateRegistration(id: string, data: UpdateRegistrationData) {
    try {
      // Walidacja danych
      const validatedData = updateRegistrationSchema.parse(data);

      // Sprawdź czy rejestracja istnieje
      const existingRegistration = await prisma.companyRegistration.findUnique({
        where: { id },
      });

      if (!existingRegistration) {
        throw new Error('Registration not found');
      }

      // Sprawdź czy można edytować
      if (existingRegistration.status !== 'PENDING') {
        throw new Error('Only pending registrations can be updated');
      }

      // Sprawdź czy nowy slug nie jest zajęty (jeśli zmieniony)
      if (validatedData.companySlug && validatedData.companySlug !== existingRegistration.companySlug) {
        const existingCompany = await prisma.company.findUnique({
          where: { slug: validatedData.companySlug },
        });

        if (existingCompany) {
          throw new Error('Company slug is already taken');
        }

        const existingSlugRegistration = await prisma.companyRegistration.findFirst({
          where: {
            id: { not: id },
            companySlug: validatedData.companySlug,
            status: { in: ['PENDING', 'APPROVED'] },
          },
        });

        if (existingSlugRegistration) {
          throw new Error('Company slug is already taken in other registrations');
        }
      }

      // Aktualizuj rejestrację
      const updatedRegistration = await prisma.companyRegistration.update({
        where: { id },
        data: validatedData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      return updatedRegistration;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Przetwarza rejestrację (zatwierdza lub odrzuca)
   */
  static async processRegistration(id: string, data: ProcessRegistrationData, adminId: string) {
    try {
      // Walidacja danych
      const validatedData = processRegistrationSchema.parse(data);

      // Sprawdź czy rejestracja istnieje
      const registration = await prisma.companyRegistration.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Sprawdź czy można przetworzyć
      if (registration.status !== 'PENDING') {
        throw new Error('Only pending registrations can be processed');
      }

      // Sprawdź czy admin istnieje
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.platformRole !== 'PLATFORM_ADMIN') {
        throw new Error('Only platform admins can process registrations');
      }

      if (validatedData.status === 'REJECTED' && !validatedData.rejectionReason) {
        throw new Error('Rejection reason is required when rejecting registration');
      }

      // Przetwórz rejestrację w transakcji
      const result = await prisma.$transaction(async (tx) => {
        // Aktualizuj status rejestracji
        const updatedRegistration = await tx.companyRegistration.update({
          where: { id },
          data: {
            status: validatedData.status,
            adminNotes: validatedData.adminNotes,
            rejectionReason: validatedData.rejectionReason,
            processedAt: new Date(),
            processedBy: adminId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        });

        // Jeśli zatwierdzona, utwórz firmę
        if (validatedData.status === 'APPROVED') {
          // Sprawdź ponownie czy slug nie jest zajęty
          const existingCompany = await tx.company.findUnique({
            where: { slug: registration.companySlug },
          });

          if (existingCompany) {
            throw new Error('Company slug is already taken');
          }

          // Utwórz firmę
          const company = await tx.company.create({
            data: {
              slug: registration.companySlug,
              name: registration.companyName,
              category: registration.category,
              city: registration.city,
              address: registration.address,
              phone: registration.phone,
              contactEmail: registration.contactEmail,
              description: registration.description,
              logoUrl: registration.logoUrl,
            },
          });

          // Utwórz domyślne ustawienia firmy
          await tx.companySettings.create({
            data: {
              companyId: company.id,
            },
          });

          // Dodaj użytkownika jako właściciela
          await tx.companyMembership.create({
            data: {
              userId: registration.userId,
              companyId: company.id,
              role: 'OWNER',
              canServe: true,
            },
          });

          return { registration: updatedRegistration, company };
        }

        return { registration: updatedRegistration };
      });

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Usuwa rejestrację (tylko oczekujące lub odrzucone)
   */
  static async deleteRegistration(id: string) {
    try {
      const registration = await prisma.companyRegistration.findUnique({
        where: { id },
      });

      if (!registration) {
        throw new Error('Registration not found');
      }

      if (registration.status === 'APPROVED') {
        throw new Error('Cannot delete approved registration');
      }

      await prisma.companyRegistration.delete({
        where: { id },
      });

      return { message: 'Registration deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera statystyki rejestracji
   */
  static async getRegistrationStats() {
    try {
      const [pending, approved, rejected, total] = await Promise.all([
        prisma.companyRegistration.count({ where: { status: 'PENDING' } }),
        prisma.companyRegistration.count({ where: { status: 'APPROVED' } }),
        prisma.companyRegistration.count({ where: { status: 'REJECTED' } }),
        prisma.companyRegistration.count(),
      ]);

      // Statystyki według kategorii
      const categoryStats = await prisma.companyRegistration.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
      });

      // Statystyki według miesięcy (ostatnie 12 miesięcy)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyStats = await prisma.companyRegistration.findMany({
        where: {
          createdAt: {
            gte: twelveMonthsAgo,
          },
        },
        select: {
          createdAt: true,
          status: true,
        },
      });

      // Grupuj według miesięcy
      const monthlyGrouped = monthlyStats.reduce((acc, registration) => {
        const month = registration.createdAt.toISOString().substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { pending: 0, approved: 0, rejected: 0, total: 0 };
        }
        acc[month][registration.status.toLowerCase() as keyof typeof acc[typeof month]]++;
        acc[month].total++;
        return acc;
      }, {} as Record<string, { pending: number; approved: number; rejected: number; total: number }>);

      return {
        overview: {
          pending,
          approved,
          rejected,
          total,
        },
        byCategory: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category,
        })),
        byMonth: Object.entries(monthlyGrouped).map(([month, stats]) => ({
          month,
          ...stats,
        })).sort((a, b) => a.month.localeCompare(b.month)),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sprawdza dostępność slug
   */
  static async checkSlugAvailability(slug: string) {
    try {
      // Sprawdź w istniejących firmach
      const existingCompany = await prisma.company.findUnique({
        where: { slug },
      });

      if (existingCompany) {
        return { available: false, reason: 'Slug is already taken by an existing company' };
      }

      // Sprawdź w oczekujących/zatwierdzonych rejestracjach
      const existingRegistration = await prisma.companyRegistration.findFirst({
        where: {
          companySlug: slug,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingRegistration) {
        return { available: false, reason: 'Slug is already taken in pending registrations' };
      }

      return { available: true };
    } catch (error) {
      throw error;
    }
  }
}