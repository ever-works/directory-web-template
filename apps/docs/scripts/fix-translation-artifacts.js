#!/usr/bin/env node
// fix-translation-artifacts.js
// Fixes two issues caused by Google Translate in i18n locale files:
// 1. Translated Docusaurus admonition types (:::warning -> :::advertencia etc.)
// 2. Translated directory names in relative Markdown links

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'i18n');

// Translated admonition type names → correct Docusaurus types
const ADMONITION_MAP = {
    // Spanish
    'advertencia': 'warning',
    'consejo': 'tip',
    'información': 'info',
    'informacion': 'info',
    'peligro': 'danger',
    'precaución': 'caution',
    'precaucion': 'caution',
    'nota': 'note',
    // German
    'warnung': 'warning',
    'tipp': 'tip',
    'gefahr': 'danger',
    'vorsicht': 'caution',
    'hinweis': 'note',
    // French
    'avertissement': 'warning',
    'astuce': 'tip',
    'remarque': 'note',
    // Italian
    'avvertenza': 'warning',
    'suggerimento': 'tip',
    'pericolo': 'danger',
    'avviso': 'note',
    // Dutch
    'waarschuwing': 'warning',
    'gevaar': 'danger',
    'voorzichtigheid': 'caution',
    // Polish
    'ostrzezenie': 'warning',
    'wskazowka': 'tip',
    // Portuguese
    'aviso': 'warning',
    'dica': 'tip',
    'perigo': 'danger',
    // Russian
    'предупреждение': 'warning',
    'совет': 'tip',
    'опасность': 'danger',
    // Bulgarian
    'предупреждение': 'warning',
    'съвет': 'tip',
    // Arabic
    'تحذير': 'warning',
    'نصيحة': 'tip',
    // Hebrew  
    'אזהרה': 'warning',
    // Chinese
    '警告': 'warning',
    '提示': 'tip',
    '危险': 'danger',
    '注意': 'note',
};

// Translated directory names in relative links → correct English names
const LINK_DIR_MAP = {
    // Spanish
    'pago': 'payment',
    'pagos': 'payment',
    'guías': 'guides',
    'guias': 'guides',
    'configuración': 'configuration',
    'configuracion': 'configuration',
    'características': 'features',
    'caracteristicas': 'features',
    'implementación': 'deployment',
    'implantación': 'deployment',
    'autenticación': 'authentication',
    'autenticacion': 'authentication',
    'desarrollo': 'development',
    'internacionalización': 'internationalization',
    'internacionalizacion': 'internationalization',
    // German
    'zahlung': 'payment',
    'zahlungen': 'payment',
    'konfiguration': 'configuration',
    'funktionen': 'features',
    'bereitstellung': 'deployment',
    'authentifizierung': 'authentication',
    'entwicklung': 'development',
    // French
    'paiement': 'payment',
    'fonctionnalités': 'features',
    'fonctionnalites': 'features',
    // Italian
    'pagamento': 'payment',
    'funzionalità': 'features',
    'funzionalita': 'features',
    'autenticazione': 'authentication',
    'distribuzione': 'deployment',
    // Dutch
    'betaling': 'payment',
    'implementatie': 'deployment',
    'authenticatie': 'authentication',
    // Polish
    'płatność': 'payment',
    'platnosc': 'payment',
    // Portuguese
    'implantação': 'deployment',
    'implantacao': 'deployment',
    // Russian
    'оплата': 'payment',
    'функции': 'features',
    'развертывание': 'deployment',
};

function escapeRegex(s) {
    return s.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
        } else if (entry.name.endsWith('.md')) {
            fixFile(full);
        }
    }
}

let totalFilesFixed = 0;
let totalReplacements = 0;

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let count = 0;

    // 1. Fix translated admonition types
    // Pattern: :::translated-word followed by space or newline
    for (const [translated, correct] of Object.entries(ADMONITION_MAP)) {
        if (translated === correct) continue; // skip no-ops
        const re = new RegExp(':::' + escapeRegex(translated) + '(?=\\s|$)', 'gi');
        if (re.test(content)) {
            content = content.replace(re, ':::' + correct);
            count++;
        }
    }

    // 2. Fix translated directory names in relative Markdown links
    // Pattern: ../<translated-dir>/ or ](./<translated-dir>/ or just (./<translated-dir>/
    for (const [translated, correct] of Object.entries(LINK_DIR_MAP)) {
        if (translated === correct) continue;
        const re = new RegExp('(\\.{1,2}/)' + escapeRegex(translated) + '/', 'g');
        if (re.test(content)) {
            content = content.replace(re, '$1' + correct + '/');
            count++;
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalFilesFixed++;
        totalReplacements += count;
        console.log(`Fixed (${count} replacements): ${path.relative(BASE, filePath)}`);
    }
}

walk(BASE);
console.log(`\nDone: ${totalFilesFixed} files fixed, ${totalReplacements} total replacements.`);
