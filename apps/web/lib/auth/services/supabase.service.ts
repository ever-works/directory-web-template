import { AuthService } from "./auth.service";
import { supabaseAuth } from "../supabase";

export class SupabaseService implements AuthService {
  private static instance: SupabaseService;

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async signIn(email: string, password: string): Promise<any> {
    try {
      const { error } = await supabaseAuth.signInWithPassword(email, password);
      return { error };
    } catch (error) {
      console.error("Error in Supabase signIn:", error);
      return { error };
    }
  }
  async signOut(): Promise<any> {
    const { error } = await supabaseAuth.signOut();
    return error;
  }
  async signUp(email: string, password: string, options?: any): Promise<any> {
    const { data, error } = await supabaseAuth.signUp(email, password, options);
    if (error) {
      throw error;
    }
    return data;
  }

  async getCurrentUser(): Promise<any | null> {
    const { data, error } = await supabaseAuth.getUser();
    if (error) {
      throw error;
    }
    return data.user;
  }

  async signInWithCredentials(credentials: any): Promise<any> {
    const { error } = await supabaseAuth.signInWithPassword(
      credentials.email,
      credentials.password
    );
    if (error) {
      throw error;
    }
    return error;
  }

  async signInWithOAuth(provider: any, options?: any): Promise<any> {
    const { data, error } = await supabaseAuth.signInWithOAuth(
      provider,
      options
    );
    if (error) {
      throw error;
    }
    return data;
  }
}
