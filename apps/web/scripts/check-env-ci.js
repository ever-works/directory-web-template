#!/usr/bin/env node

/**
 * CI/CD Environment Check Script
 * This script is designed to never fail in CI/CD environments
 * It only provides warnings but never exits with error code
 */

// Load environment variables from .env files
const fs = require("node:fs")
const path = require("node:path")
const dotenv = require("dotenv");

// Parse command line arguments
const args = process.argv.slice(2);
const silentMode = args.includes("--silent") || args.includes("-s");

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
  // Ignore errors in CI mode
}

// Define critical variable patterns
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];

// Get all environment variables
const allEnvVars = Object.keys(process.env);

// Determine which variables are missing based on .env.example
const missingVars = exampleEnvVars.filter(varName => !process.env[varName]);

// Determine which variables are critical
const missingCriticalVars = missingVars.filter(varName => 
  CRITICAL_PATTERNS.some(pattern => pattern.test(varName))
);

// In CI mode, we NEVER exit with error - only show warnings
if (missingCriticalVars.length > 0 && !silentMode) {
  print('yellow', `⚠️  Missing critical variables: ${missingCriticalVars.join(', ')}`);
  print('yellow', '   Build will continue but some features may not work properly.');
}

// Always exit with success in CI mode
process.exit(0);
