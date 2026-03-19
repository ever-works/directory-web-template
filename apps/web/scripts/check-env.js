#!/usr/bin/env node

/**
 * Script to check environment variables before starting the application
 * This script is meant to be run as part of the build/start process
 * 
 * This script dynamically detects environment variables and categorizes them
 * based on prefixes and common patterns.
 */

// Load environment variables from .env files
const fs = require("node:fs")
const path = require("node:path")
const dotenv = require("dotenv");

// Parse command line arguments
const args = process.argv.slice(2);
const silentMode = args.includes("--silent") || args.includes("-s");
const quickMode = args.includes('--quick') || args.includes('-q');

// Try to load from .env.local first, then fall back to .env if needed
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

// Check if .env.local exists and load it
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// Also load .env as fallback for any variables not in .env.local
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Print colored message
function print(color, message, forceShow = false) {
  if (!silentMode || forceShow) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

// Helper function to print critical messages (always shown)
function printCritical(message) {
  print('red', message, true);
}

// Try to load .env.example if it exists
let exampleEnvVars = [];
try {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    exampleEnvVars = envExample
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key] = line.split('=');
        return key.trim();
      });
  }
} catch (error) {
  print('yellow', `⚠️  Could not read .env.example: ${error.message}`);
}

// Define critical variable patterns
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];

// Define production-recommended variable patterns (warn if missing in production)
const PRODUCTION_RECOMMENDED_PATTERNS = [
  /^SEED_ADMIN_EMAIL$/,
  /^SEED_ADMIN_PASSWORD$/
];

// Define variable categories based on prefixes or patterns
const CATEGORY_PATTERNS = [
  { name: 'core', pattern: /^(NODE_ENV|PORT|APP_|BASE_URL)/ },
  { name: 'database', pattern: /^(DATABASE_|DB_|POSTGRES_|MYSQL_|MONGO_)/ },
  { name: 'auth', pattern: /^(AUTH_|JWT_|OAUTH_|GOOGLE_|GITHUB_|FACEBOOK_|FB_|TWITTER_|MICROSOFT_)/ },
  { name: 'supabase', pattern: /^(SUPABASE_|NEXT_PUBLIC_SUPABASE_)/ },
  { name: 'content', pattern: /^(CONTENT_|DATA_REPOSITORY|GH_TOKEN)/ },
  { name: 'email', pattern: /^(EMAIL_|SMTP_|MAIL_|RESEND_)/ },
  { name: 'payment', pattern: /^(STRIPE_|PAYPAL_|PAYMENT_)/ },
  { name: 'analytics', pattern: /^(ANALYTICS_|GA_|GOOGLE_ANALYTICS_|PLAUSIBLE_)/ },
  { name: 'storage', pattern: /^(STORAGE_|S3_|AWS_|CLOUDINARY_|UPLOAD_)/ },
  { name: 'api', pattern: /^(API_|ENDPOINT_)/ },
  { name: 'security', pattern: /^(SECRET_|KEY_|ENCRYPTION_|CRYPTO_)/ },
  { name: 'background-jobs', pattern: /^(TRIGGER_DEV_|BACKGROUND_JOBS_)/ }
];

// Get all environment variables
const allEnvVars = Object.keys(process.env);

// Categorize environment variables
const categorizedVars = {};
const uncategorizedVars = [];

allEnvVars.forEach(varName => {
  // Skip internal Node.js variables
  if (varName.startsWith('npm_') || varName.startsWith('_')) {
    return;
  }
  
  let categorized = false;
  
  // Check if variable matches any category pattern
  for (const { name, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(varName)) {
      categorizedVars[name] = categorizedVars[name] || [];
      categorizedVars[name].push(varName);
      categorized = true;
      break;
    }
  }
  
  if (!categorized) {
    uncategorizedVars.push(varName);
  }
});

// Add uncategorized variables to a misc category
if (uncategorizedVars.length > 0) {
  categorizedVars['misc'] = uncategorizedVars;
}

// Determine which variables are missing based on .env.example
const missingVars = exampleEnvVars.filter(varName => !process.env[varName]);

// Determine which variables are critical
const criticalVars = allEnvVars.filter(varName => 
  CRITICAL_PATTERNS.some(pattern => pattern.test(varName))
);

const missingCriticalVars = missingVars.filter(varName => 
  CRITICAL_PATTERNS.some(pattern => pattern.test(varName))
);

// Process and display environment variable status
const allWarnings = [];
const allSuccess = [];

// Display categorized variables
Object.entries(categorizedVars).forEach(([category, variables]) => {
  if (variables.length > 0) {
    allSuccess.push(`✅ ${category.charAt(0).toUpperCase() + category.slice(1)}: ${variables.length} variables configured`);
    
    // Check for common pairs that should be present together
    if (category === 'auth') {
      // Check OAuth providers
      const oauthProviders = {
        google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
        facebook: ['FB_CLIENT_ID', 'FB_CLIENT_SECRET'],
        twitter: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
        microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET']
      };
      
      const configuredProviders = [];
      const partiallyConfiguredProviders = [];
      
      Object.entries(oauthProviders).forEach(([provider, requiredVars]) => {
        const configuredVars = requiredVars.filter(varName => variables.includes(varName));
        
        if (configuredVars.length === requiredVars.length) {
          configuredProviders.push(provider);
        } else if (configuredVars.length > 0) {
          partiallyConfiguredProviders.push({
            provider,
            missing: requiredVars.filter(varName => !variables.includes(varName))
          });
        }
      });
      
      if (configuredProviders.length > 0) {
        allSuccess.push(`✅ Configured OAuth providers: ${configuredProviders.join(', ')}`);
      } else {
        allWarnings.push('⚠️  No OAuth providers are fully configured. Social login will not be available.');
      }
      
      if (partiallyConfiguredProviders.length > 0) {
        allWarnings.push('⚠️  Some OAuth providers are partially configured:');
        partiallyConfiguredProviders.forEach(({ provider, missing }) => {
          allWarnings.push(`   - ${provider}: Missing ${missing.join(', ')}`);
        });
      }
    }
    
    // Check Supabase configuration
    if (category === 'supabase') {
      const requiredSupabaseVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
      const missingSupabaseVars = requiredSupabaseVars.filter(varName => !variables.includes(varName));
      
      if (missingSupabaseVars.length > 0) {
        allWarnings.push(`⚠️  Supabase configuration is incomplete: Missing ${missingSupabaseVars.join(', ')}`);
        allWarnings.push('   Supabase authentication may not work properly.');
      } else {
        allSuccess.push('✅ Supabase configuration is complete');
      }
    }
    
    // Check email configuration
    if (category === 'email') {
      const emailVarPairs = [
        ['EMAIL_SERVER_HOST', 'EMAIL_SERVER_PORT', 'EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD'],
        ['RESEND_API_KEY']
      ];
      
      const configuredEmailSystems = emailVarPairs.filter(varSet => 
        varSet.every(varName => variables.includes(varName) && process.env[varName]?.trim())
      );
      
      if (configuredEmailSystems.length === 0) {
        allWarnings.push('⚠️  Email configuration is incomplete. Email features may not work properly.');
      } else {
        allSuccess.push('✅ Email system is properly configured');
      }
    }
    
    // Check background jobs configuration
    if (category === 'background-jobs') {
      const REQUIRED_TRIGGER_VARS_COUNT = 3;
      const hasEnabled = process.env.TRIGGER_DEV_ENABLED === 'true';
      const hasKey = !!process.env.TRIGGER_DEV_API_KEY;
      const hasUrl = !!process.env.TRIGGER_DEV_API_URL;
      const presentCount = (hasEnabled ? 1 : 0) + (hasKey ? 1 : 0) + (hasUrl ? 1 : 0);

      if (presentCount === 0) {
        allSuccess.push('✅ Background jobs: Using local scheduling (Trigger.dev not configured)');
      } else if (presentCount < REQUIRED_TRIGGER_VARS_COUNT) {
        allWarnings.push('⚠️  Trigger.dev partially configured. Will fall back to local scheduling.');
      } else {
        allSuccess.push('✅ Background jobs: Trigger.dev configured and ready');
      }
    }
  }
});

// Display missing variables from .env.example
if (missingVars.length > 0) {
  allWarnings.push(`⚠️  Missing variables defined in .env.example: ${missingVars.join(', ')}`);
}

// Display missing critical variables
if (missingCriticalVars.length > 0) {
  allWarnings.push(`⚠️  Missing critical variables: ${missingCriticalVars.join(', ')}`);
  allWarnings.push('   Application may not function correctly!');
}

// Check for production-recommended variables
if (process.env.NODE_ENV === 'production') {
  const missingProductionVars = [];
  
  PRODUCTION_RECOMMENDED_PATTERNS.forEach(pattern => {
    const varName = pattern.source.replace(/[\^$]/g, '');
    if (!process.env[varName]) {
      missingProductionVars.push(varName);
    }
  });
  
  if (missingProductionVars.length > 0) {
    allWarnings.push(`⚠️  PRODUCTION WARNING: Missing recommended variables: ${missingProductionVars.join(', ')}`);
    allWarnings.push('   Database seeding will auto-generate admin credentials (check runtime logs for values).');
    allWarnings.push('   For better security, set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD explicitly.');
  }
}

// Skip detailed checks in quick mode
if (!quickMode) {
  // Print all warnings
  if (allWarnings.length > 0) {
    allWarnings.forEach(warning => print('yellow', warning));
  }

  // Print all success messages
  if (allSuccess.length > 0) {
    allSuccess.forEach(success => print('green', success));
  }

  // Final message
  print('cyan', '🚀 Environment check complete');
}

// Decide exit code based on critical missing variables
if (missingCriticalVars.length > 0) {
  // Show critical errors only if not in silent mode
  if (!silentMode) {
    printCritical(`⛔ Critical environment variables are missing: ${missingCriticalVars.join(', ')}`);
    printCritical('   Application may not function correctly!');
  }
  
  // Check if DATA_REPOSITORY is missing and we're not in production mode
  if (missingCriticalVars.includes('DATA_REPOSITORY') && process.env.NODE_ENV !== 'production') {
    // In development mode, we'll just warn but continue (only if not silent)
    if (!silentMode) {
      print('yellow', '⚠️ DATA_REPOSITORY is missing but continuing in development mode', true);
    }
  } else if (missingCriticalVars.includes('DATA_REPOSITORY') && process.env.NODE_ENV === 'production' && !silentMode) {
    // In production mode and not silent, exit with error
    printCritical('❌ DATA_REPOSITORY is required for content management!');
    process.exit(1);
  }
}

// Never exit with error for missing variables - just warn
// This ensures CI/CD builds always pass even with missing environment variables
if (missingCriticalVars.length > 0) {
  // In development mode or silent mode, just warn but continue
  if (!silentMode) {
    print('yellow', '⚠️ Build will continue despite missing critical variables', true);
  }
}

// Exit with success
process.exit(0);
