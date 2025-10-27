import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Walidacja enumów
export const CompanyCategory = {
  BEAUTY: 'BEAUTY',
  HEALTH: 'HEALTH',
  AUTOMOTIVE: 'AUTOMOTIVE',
  OTHER: 'OTHER'
} as const;

export const CompanyRole = {
  OWNER: 'OWNER',
  WORKER: 'WORKER'
} as const;

export type CompanyCategoryType = typeof CompanyCategory[keyof typeof CompanyCategory];
export type CompanyRoleType = typeof CompanyRole[keyof typeof CompanyRole];

// Schematy walidacji
export const createCompanySchema = z.object({
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Company name is required'),
  category: z.enum(['BEAUTY', 'HEALTH', 'AUTOMOTIVE', 'OTHER']),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  contactEmail: z.string().email('Invalid email format'),
  description: z.string().optional(),
  timezone: z.string().default('Europe/Warsaw'),
  logoUrl: z.string().url().optional(),
});

export const updateCompanySchema = z.object({
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  name: z.string().min(1, 'Company name is required').optional(),
  category: z.enum(['BEAUTY', 'HEALTH', 'AUTOMOTIVE', 'OTHER']).optional(),
  city: z.string().min(1, 'City is required').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const companySettingsSchema = z.object({
  slotMinutes: z.number().min(5, 'Slot duration must be at least 5 minutes').max(480, 'Slot duration cannot exceed 8 hours'),
  traineeExtraMinutes: z.number().min(0, 'Trainee extra minutes cannot be negative').max(120, 'Trainee extra minutes cannot exceed 2 hours'),
  autoAcceptReservations: z.boolean(),
});

export const workingHoursSchema = z.object({
  weekday: z.number().min(0, 'Weekday must be between 0-6').max(6, 'Weekday must be between 0-6'),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
});

export const workBreakSchema = z.object({
  weekday: z.number().min(0, 'Weekday must be between 0-6').max(6, 'Weekday must be between 0-6'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
});

export const companyMembershipSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['OWNER', 'WORKER']),
  canServe: z.boolean().default(false),
  isTrainee: z.boolean().default(false),
});

export type CreateCompanyData = z.infer<typeof createCompanySchema>;
export type UpdateCompanyData = z.infer<typeof updateCompanySchema>;
export type CompanySettingsData = z.infer<typeof companySettingsSchema>;
export type WorkingHoursData = z.infer<typeof workingHoursSchema>;
export type WorkBreakData = z.infer<typeof workBreakSchema>;
export type CompanyMembershipData = z.infer<typeof companyMembershipSchema>;

export class CompanyService {
  /**
   * Tworzy nową firmę
   */
  static async createCompany(data: CreateCompanyData, ownerId: string) {
    try {
      // Walidacja danych
      const validatedData = createCompanySchema.parse(data);

      // Sprawdź czy slug jest unikalny
      const existingCompany = await prisma.company.findUnique({
        where: { slug: validatedData.slug },
      });

      if (existingCompany) {
        throw new Error('Company with this slug already exists');
      }

      // Utwórz firmę w transakcji
      const result = await prisma.$transaction(async (tx) => {
        // Utwórz firmę
        const company = await tx.company.create({
          data: validatedData,
        });

        // Utwórz domyślne ustawienia
        await tx.companySettings.create({
          data: {
            companyId: company.id,
          },
        });

        // Dodaj właściciela jako członka
        await tx.companyMembership.create({
          data: {
            userId: ownerId,
            companyId: company.id,
            role: CompanyRole.OWNER,
            canServe: true,
          },
        });

        return company;
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
   * Pobiera firmę po ID
   */
  static async getCompanyById(id: string, includeSettings = false) {
    try {
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          settings: includeSettings,
          workingHours: includeSettings,
          workBreaks: includeSettings,
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      return company;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera firmę po slug
   */
  static async getCompanyBySlug(slug: string, includeSettings = false) {
    try {
      const company = await prisma.company.findUnique({
        where: { slug },
        include: {
          settings: includeSettings,
          workingHours: includeSettings,
          workBreaks: includeSettings,
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      return company;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pobiera listę firm z paginacją i filtrowaniem
   */
  static async getCompanies(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: CompanyCategoryType;
    city?: string;
    isActive?: boolean;
  } = {}) {
    try {
      const { page = 1, limit = 10, search, category, city, isActive = true } = options;
      const skip = (page - 1) * limit;

      const where: any = { isActive };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (city) {
        where.city = { contains: city, mode: 'insensitive' };
      }

      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            city: true,
            address: true,
            phone: true,
            contactEmail: true,
            description: true,
            logoUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.company.count({ where }),
      ]);

      return {
        companies,
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
   * Aktualizuje firmę
   */
  static async updateCompany(id: string, data: UpdateCompanyData) {
    try {
      // Walidacja danych
      const validatedData = updateCompanySchema.parse(data);

      // Sprawdź czy firma istnieje
      const existingCompany = await prisma.company.findUnique({
        where: { id },
      });

      if (!existingCompany) {
        throw new Error('Company not found');
      }

      // Sprawdź czy slug nie jest już zajęty przez inną firmę
      if (validatedData.slug && validatedData.slug !== existingCompany.slug) {
        const slugExists = await prisma.company.findUnique({
          where: { slug: validatedData.slug },
        });

        if (slugExists) {
          throw new Error('Slug is already taken by another company');
        }
      }

      // Aktualizuj firmę
      const updatedCompany = await prisma.company.update({
        where: { id },
        data: validatedData,
      });

      return updatedCompany;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Usuwa firmę
   */
  static async deleteCompany(id: string) {
    try {
      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      await prisma.company.delete({
        where: { id },
      });

      return { message: 'Company deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje ustawienia firmy
   */
  static async updateCompanySettings(companyId: string, data: CompanySettingsData) {
    try {
      // Walidacja danych
      const validatedData = companySettingsSchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Aktualizuj ustawienia
      const settings = await prisma.companySettings.upsert({
        where: { companyId },
        update: validatedData,
        create: {
          companyId,
          ...validatedData,
        },
      });

      return settings;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Dodaje godziny pracy
   */
  static async setWorkingHours(companyId: string, hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) {
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        await tx.workingHours.deleteMany({ where: { companyId } });
        await tx.workingHours.createMany({
          data: hours.map((h) => ({
            companyId,
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime,
            endTime: h.endTime,
            isActive: h.isActive,
          })),
        });
        const created = await tx.workingHours.findMany({ where: { companyId } });
        return created;
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje godziny pracy
   */
  static async updateWorkingHours(companyId: string, weekday: number, data: Partial<WorkingHoursData>) {
    try {
      // Sprawdź czy godziny istnieją
      const existingHours = await prisma.workingHours.findUnique({
        where: {
          companyId_weekday: {
            companyId,
            weekday,
          },
        },
      });

      if (!existingHours) {
        throw new Error('Working hours not found');
      }

      // Aktualizuj godziny
      const updatedHours = await prisma.workingHours.update({
        where: {
          companyId_weekday: {
            companyId,
            weekday,
          },
        },
        data,
      });

      return updatedHours;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usuwa godziny pracy
   */
  static async deleteWorkingHours(companyId: string, weekday: number) {
    try {
      const existingHours = await prisma.workingHours.findUnique({
        where: {
          companyId_weekday: {
            companyId,
            weekday,
          },
        },
      });

      if (!existingHours) {
        throw new Error('Working hours not found');
      }

      await prisma.workingHours.delete({
        where: {
          companyId_weekday: {
            companyId,
            weekday,
          },
        },
      });

      return { message: 'Working hours deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dodaje przerwę w pracy
   */
  static async addWorkBreak(companyId: string, data: WorkBreakData) {
    try {
      // Walidacja danych
      const validatedData = workBreakSchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Dodaj przerwę
      const workBreak = await prisma.workBreak.create({
        data: {
          companyId,
          ...validatedData,
        },
      });

      return workBreak;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Usuwa przerwę w pracy
   */
  static async deleteWorkBreak(id: string) {
    try {
      const workBreak = await prisma.workBreak.findUnique({
        where: { id },
      });

      if (!workBreak) {
        throw new Error('Work break not found');
      }

      await prisma.workBreak.delete({
        where: { id },
      });

      return { message: 'Work break deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dodaje członka do firmy
   */
  static async addCompanyMember(companyId: string, data: CompanyMembershipData) {
    try {
      // Walidacja danych
      const validatedData = companyMembershipSchema.parse(data);

      // Sprawdź czy firma istnieje
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Sprawdź czy użytkownik istnieje
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Sprawdź czy członkostwo już istnieje
      const existingMembership = await prisma.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId: validatedData.userId,
            companyId,
          },
        },
      });

      if (existingMembership) {
        throw new Error('User is already a member of this company');
      }

      // Dodaj członka
      const membership = await prisma.companyMembership.create({
        data: {
          companyId,
          ...validatedData,
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

      return membership;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Pobiera członków firmy
   */
  static async getCompanyMembers(companyId: string) {
    try {
      const members = await prisma.companyMembership.findMany({
        where: { companyId, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: { role: 'desc' }, // OWNER first, then WORKER
      });

      return members;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualizuje członkostwo w firmie
   */
  static async updateCompanyMember(companyId: string, userId: string, data: Partial<CompanyMembershipData>) {
    try {
      const membership = await prisma.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      if (!membership) {
        throw new Error('Company membership not found');
      }

      const updatedMembership = await prisma.companyMembership.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data,
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

      return updatedMembership;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usuwa członka z firmy
   */
  static async removeCompanyMember(companyId: string, userId: string) {
    try {
      const membership = await prisma.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      if (!membership) {
        throw new Error('Company membership not found');
      }

      await prisma.companyMembership.delete({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      return { message: 'Company member removed successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async getCompanyStats() {
    try {
      const totalCompanies = await prisma.company.count();
      const activeCompanies = await prisma.company.count({ where: { isActive: true } });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newCompanies = await prisma.company.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Stats by category
      const categoryStats = await prisma.company.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
      });

      return {
        overview: {
          total: totalCompanies,
          active: activeCompanies,
          inactive: totalCompanies - activeCompanies,
          newLast30Days: newCompanies,
        },
        byCategory: categoryStats.map((c) => ({
          category: c.category,
          count: c._count.category,
        })),
      };
    } catch (error) {
      throw error;
    }
  }
}