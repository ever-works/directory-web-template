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

/**
 * Server-side wrapper around PostHog's `/api/projects/<id>/...`
 * insight endpoints. Used by analytics dashboards / scheduled
 * reports — distinct from the browser-side `posthog-js` client
 * which speaks the `/capture` ingest path.
 *
 * **Footguns worth knowing:**
 *
 *   - **Errors return `0` / `{}`, not throws.** Every public
 *     fetcher wraps `makeRequest` in try/catch and falls back to
 *     an empty/zero value. Callers cannot distinguish "PostHog is
 *     down / misconfigured" from "this query genuinely has 0
 *     events". A dashboard showing zero traffic could be either —
 *     check the `[PostHogApiService]` console.error lines.
 *
 *   - **`isConfigured()` is checked INSIDE `makeRequest`** as a
 *     thrown error which the outer try/catch swallows. A
 *     missing `personalApiKey` or `projectId` silently produces
 *     zero-data dashboards rather than a clear "PostHog is not
 *     configured" message.
 *
 *   - **Singleton captured at module-load.** `analyticsConfig`
 *     values are read in the constructor of the bottom-of-file
 *     `postHogApiService` singleton. Runtime env changes don't
 *     propagate; restart the process to pick them up.
 *
 *   - **`baseUrl` strips `/js`** because `POSTHOG_HOST` is the
 *     value used by the browser SDK (which appends `/js/<key>`).
 *     The REST API lives at the bare host. Don't "fix" this
 *     stripper without checking both call paths.
 *
 *   - **Date range uses `toISOString().split('T')[0]`** — that's
 *     a UTC `YYYY-MM-DD`. Users in extreme timezones (UTC+12 /
 *     UTC-11) may see day boundaries shifted by ±1 day relative
 *     to their local "today". For aggregate trends this is
 *     negligible; for "today vs yesterday" comparisons it can
 *     cross a tier boundary.
 *
 *   - **`cache: 'no-cache'`** disables Next.js fetch caching;
 *     without it dashboards would freeze on the first response
 *     per build. Required for fresh data.
 */
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