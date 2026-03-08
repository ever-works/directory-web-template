import { configureOAuthProviders } from './providers';
import { getAuthConfig } from './config';

export function setupAuth() {
  const baseConfig = getAuthConfig();
  const fullConfig = configureOAuthProviders(baseConfig);
  return fullConfig;
}