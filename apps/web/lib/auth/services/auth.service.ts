interface AuthCredentials {
  email: string;
  password: string;
  [key: string]: any;
}

interface AuthResult {
  error?: any;
  user?: any;
  url?: string;
}

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  signUp(email: string, password: string): Promise<AuthResult>;
  getCurrentUser(): Promise<any | null>;
  signInWithCredentials(credentials: AuthCredentials): Promise<AuthResult>;
  signInWithOAuth(
    provider: string,
    options?: Record<string, any>
  ): Promise<AuthResult>;
}
