import { POSTHOG_HOST } from '@/lib/constants';
import { analyticsConfig } from '@/lib/config/config-service';

export interface PostHogInsightResponse {
  results: Array<{
    data: number[];
    labels: string[];
    count: number;
  }>;
}

export interface PostHogEventResponse {
  results: Array<{
    event: string;
    timestamp: string;
    properties: Record<string, unknown>;
  }>;
  count: number;
}

export class PostHogApiService {
  private readonly apiKey: string | undefined;
  private readonly projectId: string | undefined;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = analyticsConfig.posthog.personalApiKey;
    this.projectId = analyticsConfig.posthog.projectId;
    this.baseUrl = POSTHOG_HOST?.value?.replace('/js', '') || 'https://us.i.posthog.com';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('PostHog API is not configured');
    }

    const url = new URL(`${this.baseUrl}/api/projects/${this.projectId}/${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as T;
  }

  async getTotalPageViews(days = 30): Promise<number> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const params = {
        events: JSON.stringify([
          {
            id: '$pageview',
            name: '$pageview',
            type: 'events',
            order: 0,
          },
        ]),
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
        insight: 'TRENDS',
      };

      const response = await this.makeRequest<PostHogInsightResponse>('insights/trend/', params);

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        return result.data.reduce((sum, value) => sum + value, 0);
      }

      return 0;
    } catch (error) {
      console.error('Error fetching total page views from PostHog:', error);
      return 0; // Graceful fallback
    }
  }

  async getPageViewsByDateRange(dateFrom: Date, dateTo: Date): Promise<Record<string, number>> {
    try {
      const params = {
        events: JSON.stringify([
          {
            id: '$pageview',
            name: '$pageview',
            type: 'events',
            order: 0,
          },
        ]),
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
        insight: 'TRENDS',
        interval: 'day',
      };

      const response = await this.makeRequest<PostHogInsightResponse>('insights/trend/', params);

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const viewsByDate: Record<string, number> = {};

        result.labels.forEach((label, index) => {
          viewsByDate[label] = result.data[index] || 0;
        });

        return viewsByDate;
      }

      return {};
    } catch (error) {
      console.error('Error fetching page views by date range from PostHog:', error);
      return {};
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.projectId);
  }
}

export const postHogApiService = new PostHogApiService();