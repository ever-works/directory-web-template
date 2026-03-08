import { createBrowserClient } from '@supabase/ssr';
import { getAuthConfig } from '../config';

export function createClient() {
    const config = getAuthConfig();
    
    if (!config.supabase?.url || !config.supabase?.anonKey) {
      throw new Error('Supabase configuration is missing. Please provide URL and anonymous key.');
    }
  return createBrowserClient(
    config.supabase.url,
    config.supabase.anonKey
  )
}