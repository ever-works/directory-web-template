import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { authConfig } from '@/lib/config/config-service';

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = authConfig.supabase.url;
  const supabaseAnonKey = authConfig.supabase.anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            console.error('Failed to set cookies')
          }
        },
      }  as CookieMethodsServer,
    }
  )
}