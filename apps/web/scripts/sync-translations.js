const fs = require('fs');
const path = require('path');

// Read the English file as reference
const enPath = path.join(__dirname, '../messages/en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Get all translation files
const messagesDir = path.join(__dirname, '../messages');
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

// Function to deep merge objects (existing values take priority)
function deepMerge(target, source) {
  const result = { ...source };
  for (const key in target) {
    if (target.hasOwnProperty(key)) {
      if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
        result[key] = deepMerge(target[key], source[key] || {});
      } else {
        result[key] = target[key];
      }
    }
  }
  return result;
}

// Function to count keys recursively
function countKeys(obj) {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

const enKeyCount = countKeys(en);
console.log(`English file has ${enKeyCount} translation keys\n`);

files.forEach(file => {
  const filePath = path.join(messagesDir, file);
  const lang = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const langKeyCount = countKeys(lang);
  
  if (langKeyCount < enKeyCount) {
    console.log(`${file}: ${langKeyCount}/${enKeyCount} keys (missing ${enKeyCount - langKeyCount})`);
    
    // Merge English as base with existing translations
    const merged = deepMerge(lang, en);
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    console.log(`  -> Updated ${file} with missing keys from English\n`);
  } else {
    console.log(`${file}: ${langKeyCount}/${enKeyCount} keys - OK`);
  }
});

console.log('\nDone!');

