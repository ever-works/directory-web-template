#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning CodeQL environment...');

// Directories to clean
const dirsToClean = [
  '.github/codeql',
  '.codeql',
  '~/.codeql'
];

// Files to check and remove
const filesToCheck = [
  '.github/codeql/codeql-config.yml',
  'codeql-config.yml'
];

let cleaned = false;

// Clean directories
dirsToClean.forEach(dir => {
  const fullPath = dir.startsWith('~') ? path.join(process.env.HOME, dir.slice(1)) : dir;
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dir}`);
      cleaned = true;
    } catch (error) {
      console.log(`⚠️  Could not remove ${dir}: ${error.message}`);
    }
  } else {
    console.log(`ℹ️  Directory not found: ${dir}`);
  }
});

// Check for config files
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`✅ Removed file: ${file}`);
      cleaned = true;
    } catch (error) {
      console.log(`⚠️  Could not remove ${file}: ${error.message}`);
    }
  }
});

if (cleaned) {
  console.log('\n🎉 CodeQL environment cleaned successfully!');
  console.log('📋 Next steps:');
  console.log('   1. Push your changes to GitHub');
  console.log('   2. Run the "Disable Default CodeQL" workflow');
  console.log('   3. Test your main CodeQL workflow');
} else {
  console.log('\nℹ️  No CodeQL files found to clean');
  console.log('✅ Environment is already clean');
}

console.log('\n🔧 To disable default CodeQL in GitHub:');
console.log('   1. Go to Settings → Security → Code security and analysis');
console.log('   2. Find "Code scanning" and click Configure');
console.log('   3. Disable the default CodeQL setup');
console.log('   4. Save changes');
