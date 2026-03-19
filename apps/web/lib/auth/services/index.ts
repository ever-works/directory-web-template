import { NextAuthService } from './next-auth.service';
import { SupabaseService } from './supabase.service';


const authService = NextAuthService.getInstance();
const supabaseService = SupabaseService.getInstance();

export const authServiceFactory = (provider: string) => {
    switch (provider) {
        case 'next-auth':
            return authService;
        case 'supabase':
            return supabaseService;
        default:
            throw new Error('Invalid provider');
    }
}



