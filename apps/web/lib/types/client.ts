// ######################### Client Types #########################

import type { ClientProfileWithAuth } from '@/lib/db/queries';

export interface CreateClientRequest {
  /** @deprecated use `email` instead */
  userId?: string;
  email: string;
  displayName?: string;
  username?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  phone?: string;
  website?: string;
  location?: string;
  accountType?: 'individual' | 'business' | 'enterprise';
  status?: 'active' | 'inactive' | 'suspended' | 'trial';
  plan?: 'free' | 'standard' | 'premium';
  timezone?: string;
  language?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  totalSubmissions?: number;
}

export interface UpdateClientRequest {
  id: string;
  displayName?: string;
  username?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  phone?: string;
  website?: string;
  location?: string;
  accountType?: 'individual' | 'business' | 'enterprise';
  status?: 'active' | 'inactive' | 'suspended' | 'trial';
  plan?: 'free' | 'standard' | 'premium';
  timezone?: string;
  language?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
}

// Client-specific response types using the shared PaginatedResponse
export type ClientListResponse = 
  | {
      success: true;
      data: { clients: ClientProfileWithAuth[] };
      meta: {
        page: number;
        totalPages: number;
        total: number;
        limit: number;
      };
    }
  | { success: false; error: string };

export type ClientResponse = 
  | {
      success: true;
      data: ClientProfileWithAuth;
    }
  | { success: false; error: string };

export interface ClientListOptions {
  status?: 'active' | 'inactive' | 'suspended' | 'trial';
  plan?: 'free' | 'standard' | 'premium';
  accountType?: 'individual' | 'business' | 'enterprise';
  provider?: string; // New: filter by authentication provider
  page?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: 'displayName' | 'username' | 'accountType' | 'status' | 'plan' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  userId?: string;
}

// Dashboard response types
export interface ClientDashboardResponse {
  success: boolean;
  data: {
    clients: ClientProfileWithAuth[];
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
    };
    stats: ClientStats;
  };
  error?: string;
}

export interface ClientStats {
  overview: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    trial: number;
  };
  byProvider: Record<string, number>;
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
  byStatus: Record<string, number>;
  activity: {
    newThisWeek: number;
    newThisMonth: number;
    activeThisWeek: number;
    activeThisMonth: number;
  };
  growth: {
    weeklyGrowth: number;
    monthlyGrowth: number;
  };
}

// Extended client list options for dashboard
export interface ClientDashboardOptions extends ClientListOptions {
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

// Client validation constants
export const CLIENT_VALIDATION = {
  DISPLAY_NAME_MIN_LENGTH: 2,
  DISPLAY_NAME_MAX_LENGTH: 100,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  BIO_MAX_LENGTH: 500,
  JOB_TITLE_MAX_LENGTH: 100,
  COMPANY_MAX_LENGTH: 100,
  INDUSTRY_MAX_LENGTH: 100,
  PHONE_MAX_LENGTH: 20,
  WEBSITE_MAX_LENGTH: 255,
  LOCATION_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  TAGS_MAX_LENGTH: 500,
} as const; 