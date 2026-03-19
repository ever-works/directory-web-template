import { createClient as _createClient } from "./supabase/server";

let _supabase: Awaited<ReturnType<typeof _createClient>> | undefined;
async function getSupabase() {
  return (_supabase ??= await _createClient());
}
// Define types for Supabase client and auth methods
interface SupabaseAuthResponse<T> {
  data: T;
  error: Error | null;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number; // Make expires_at optional to match Supabase's type
  user: SupabaseUser;
}

/**
 * Supabase authentication provider
 * This implementation uses dynamic imports to load Supabase only when needed
 */
export const supabaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithPassword: async (
    email: string,
    password: string
  ): Promise<
    SupabaseAuthResponse<{
      session: SupabaseSession | null;
      user: SupabaseUser | null;
    }>
  > => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.signInWithPassword({ email, password });
    } catch (error) {
      console.error("Supabase auth error:", error);
      return { data: { session: null, user: null }, error: error as Error };
    }
  },

  /**
   * Sign in with OAuth provider
   */
  signInWithOAuth: async (
    provider: "google" | "github" | "facebook" | "twitter",
    options?: { redirectTo?: string }
  ) => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options?.redirectTo,
        },
      });
    } catch (error) {
      console.error("Supabase OAuth error:", error);
      return { data: { provider, url: null }, error: error as Error };
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (
    email: string,
    password: string,
    options?: { redirectTo?: string }
  ) => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: options?.redirectTo,
        },
      });
    } catch (error) {
      console.error("Supabase signup error:", error);
      return { data: { session: null, user: null }, error: error as Error };
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase signout error:", error);
      return { error: error as Error };
    }
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.getUser();
    } catch (error) {
      console.error("Supabase get user error:", error);
      return { data: { user: null }, error: error as Error };
    }
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.getSession();
    } catch (error) {
      console.error("Supabase get session error:", error);
      return { data: { session: null }, error: error as Error };
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string, options?: { redirectTo?: string }) => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: options?.redirectTo,
      });
    } catch (error) {
      console.error("Supabase reset password error:", error);
      return { error: error as Error };
    }
  },

  /**
   * Update password
   */
  updatePassword: async (password: string) => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.updateUser({ password });
    } catch (error) {
      console.error("Supabase update password error:", error);
      return { data: { user: null }, error: error as Error };
    }
  },

  /**
   * Update user
   */
  updateUser: async (attributes: {
    email?: string;
    password?: string;
    data?: any;
  }) => {
    try {
      const supabase = await getSupabase();
      return await supabase.auth.updateUser(attributes);
    } catch (error) {
      console.error("Supabase update user error:", error);
      return { data: { user: null }, error: error as Error };
    }
  },
};
