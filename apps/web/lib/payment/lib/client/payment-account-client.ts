/**
 * Client service for payment account operations
 * Handles API calls to payment account endpoints with React Query caching
 */

import { serverClient } from '@/lib/api/server-api-client';
import { buildUrl } from '@/lib/utils/url-cleaner';

export interface PaymentAccount {
  id: string;
  userId: string;
  providerId: string;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentAccountParams {
  provider: string;
  userId: string;
  customerId: string;
}


export class PaymentAccountClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the base URL for API calls
   */
  private getApiUrl(path: string): string {
    // If baseUrl is provided, use it
    if (this.baseUrl) {
      return buildUrl(path, this.baseUrl);
    }
    
    // For server-side calls, construct absolute URL
    if (typeof window === 'undefined') {
      return buildUrl(path);
    }
    
    // For client-side calls, use relative URL
    return path;
  }

  /**
   * Get payment account by user ID and provider using serverClient
   */
  async getPaymentAccount(userId: string, provider: string): Promise<PaymentAccount | null> {
    try {
      const url = this.getApiUrl(`/api/payment/account/${userId}?provider=${provider}`);
      const response = await serverClient.get<PaymentAccount>(url);
      
      if (!response.success || !response.data) {
        return null;
      }
      
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
    } catch (error) {
      console.error('Error fetching payment account:', error);
      return null;
    }
  }

  /**
   * Create or update payment account using serverClient
   */
  async setupPaymentAccount(params: CreatePaymentAccountParams): Promise<PaymentAccount> {
    try {
      const url = this.getApiUrl('/api/payment/account');
      const response = await serverClient.post<PaymentAccount>(
        url,
        params
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to setup payment account');
      }
      
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
    } catch (error) {
      console.error('Error setting up payment account:', error);
      throw error;
    }
  }

  /**
   * Update existing payment account using serverClient
   */
  async updatePaymentAccount(id: string, params: CreatePaymentAccountParams): Promise<PaymentAccount> {
    try {
      const url = this.getApiUrl('/api/payment/account');
      const response = await serverClient.put<PaymentAccount>(
        url,
        { id, ...params }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update payment account');
      }
      
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
    } catch (error) {
      console.error('Error updating payment account:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentAccountClient = new PaymentAccountClient();

