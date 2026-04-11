#!/usr/bin/env node
/**
 * translate-docs.mjs
 *
 * Fully translates documentation files that currently only have frontmatter/H1
 * translated (body still in English). Uses the OpenAI API via native fetch.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/translate-docs.mjs [options]
 *
 * Options:
 *   --locale <code>     Only translate a single locale (e.g. --locale de)
 *   --dir <dir>         Only translate files in a specific subdir (e.g. --dir features)
 *   --dry-run           Show what would be translated without making API calls
 *   --model <model>     OpenAI model to use (default: gpt-4o-mini)
 *   --delay <ms>        Delay between API calls in ms (default: 500)
 *   --max-tokens <n>    Max tokens per response (default: 4096)
 *
 * Example:
 *   OPENAI_API_KEY=sk-... node scripts/translate-docs.mjs --locale de --dir features
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ────────────────────────────────────────────────────────────

const LOCALES = {
    ar: 'Arabic',
    bg: 'Bulgarian',
    de: 'German',
    es: 'Spanish (Latin America)',
    he: 'Hebrew',
    it: 'Italian',
    nl: 'Dutch',
    pl: 'Polish',
    pt: 'Portuguese (Brazilian)',
    ru: 'Russian',
    zh: 'Chinese (Simplified)',
};

/** Directories containing the files we need to translate */
const TARGET_DIRS = ['features', 'advanced-guide', 'payment'];

const ROOT = path.join(__dirname, '..');
const DOCS_BASE = path.join(ROOT, '../../docs');      // English source files
const I18N_BASE = path.join(ROOT, 'i18n');
const PLUGIN_DIR = 'docusaurus-plugin-content-docs-template/current';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const LOCALE_FILTER = getArg('--locale');
const DIR_FILTER = getArg('--dir');
const DRY_RUN = hasFlag('--dry-run');
const MODEL = getArg('--model') || 'gpt-4o-mini';
const DELAY_MS = parseInt(getArg('--delay') || '500', 10);
const MAX_TOKENS = parseInt(getArg('--max-tokens') || '4096', 10);
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY && !DRY_RUN) {
    console.error('ERROR: OPENAI_API_KEY environment variable is required.');
    console.error('Usage: OPENAI_API_KEY=sk-... node scripts/translate-docs.mjs');
    process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { frontmatter: '', body: content };
    return { frontmatter: match[1], body: match[2] };
}

function extractSourceBody(content) {
    const { body } = parseFrontmatter(content);
    return body;
}

/**
 * Returns true if the i18n file's body still contains the English source body
 * (i.e., only frontmatter/H1 was translated, body needs full translation).
 *
 * Detection strategy: extract a unique English phrase from the source body
 * (first substantial paragraph) and check if it appears verbatim in the
 * locale file. If yes → body is still in English → needs translation.
 */
function needsTranslation(localeFilePath, sourceFilePath) {
    if (!fs.existsSync(localeFilePath) || !fs.existsSync(sourceFilePath)) return false;
    const localeContent = fs.readFileSync(localeFilePath, 'utf8');
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');

    const { body: sourceBody } = parseFrontmatter(sourceContent);
    const fingerprint = extractBodyFingerprint(sourceBody);

    if (!fingerprint) return false;

    // If the English fingerprint appears verbatim in the locale file → needs translation
    return localeContent.includes(fingerprint);
}

/**
 * Extracts a 60-character fingerprint from the first non-heading, non-empty
 * paragraph of the English source body. Used to detect untranslated files.
 */
function extractBodyFingerprint(body) {
    const lines = body.split('\n');
    let pastH1 = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip H1 line
        if (trimmed.startsWith('# ') && !pastH1) {
            pastH1 = true;
            continue;
        }

        // Skip other headings and code fences
        if (trimmed.startsWith('#') || trimmed.startsWith('```') || trimmed.startsWith('|')) {
            continue;
        }

        // First substantive paragraph (pure prose, at least 40 chars)
        if (trimmed.length >= 40 && /[a-zA-Z]/.test(trimmed)) {
            return trimmed.slice(0, 60);
        }
    }

    return null;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── OpenAI translation ───────────────────────────────────────────────────────

async function translateWithOpenAI(content, targetLanguage, filename) {
    const systemPrompt = `You are a professional technical documentation translator. Your task is to translate Markdown documentation into ${targetLanguage}.

Translation rules:
1. Translate ALL prose text, section headings (##, ###, ####), table cell descriptions, list items, and inline explanations.
2. Keep ALL code blocks (content between triple backticks) UNCHANGED in English.
3. Keep technical identifiers unchanged: function names, class names, variable names, TypeScript types, file paths, import paths, environment variable names (e.g. DATABASE_URL), package names (e.g. next-auth, drizzle-orm), product names (Next.js, TypeScript, React, Stripe, Supabase, PostHog, etc.).
4. Preserve ALL Markdown formatting exactly: bold (**text**), italic, code spans (\`code\`), links ([text](url)), table structure (| col | col |).
5. For the YAML frontmatter (between --- markers): translate the values of "title" and "sidebar_label" only. Leave "id", "sidebar_position", and other keys unchanged.
6. The first H1 heading (# Title) should be translated.
7. Do NOT add any explanations, comments, or metadata. Return ONLY the translated Markdown.
8. Preserve blank lines, list indentation, and all structural whitespace.`;

    const userPrompt = `Translate this documentation file (${filename}) to ${targetLanguage}:\n\n${content}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: MAX_TOKENS,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    if (data.choices?.[0]?.finish_reason === 'length') {
        console.warn(`  ⚠ Response truncated due to token limit for ${filename}. Consider increasing --max-tokens.`);
    }
    
    return data.choices?.[0]?.message?.content ?? '';
}

/**
 * For very long files, split into chunks (frontmatter + body in parts),
 * translate each part, and reassemble.
 */
async function translateFile(content, targetLanguage, filename) {
    const CHAR_LIMIT = 12000; // ~3000 tokens
    
    if (content.length <= CHAR_LIMIT) {
        return await translateWithOpenAI(content, targetLanguage, filename);
    }

    // Split at code block boundaries to preserve them intact
    const { frontmatter, body } = parseFrontmatter(content);
    
    // Split body into chunks at paragraph breaks
    const chunks = splitIntoChunks(body, CHAR_LIMIT);
    
    console.log(`    → File too long (${content.length} chars), splitting into ${chunks.length} chunks`);
    
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunkLabel = `${filename} [chunk ${i + 1}/${chunks.length}]`;
        const chunkContent = i === 0 ? `---\n${frontmatter}\n---\n${chunks[i]}` : chunks[i];
        const translated = await translateWithOpenAI(chunkContent, targetLanguage, chunkLabel);
        
        if (i === 0) {
            translatedChunks.push(translated);
        } else {
            // Remove any spurious frontmatter that might appear in later chunks
            const cleanTranslated = translated.replace(/^---[\s\S]*?---\n/, '');
            translatedChunks.push(cleanTranslated);
        }
        
        if (i < chunks.length - 1) {
            await sleep(DELAY_MS);
        }
    }
    
    return translatedChunks.join('\n');
}

function splitIntoChunks(text, maxChars) {
    if (text.length <= maxChars) return [text];
    
    const chunks = [];
    let remaining = text;
    
    while (remaining.length > maxChars) {
        // Find a good split point: end of a paragraph before maxChars
        let splitAt = maxChars;
        
        // Try to split at a double newline (paragraph break)
        const lastParagraph = remaining.lastIndexOf('\n\n', maxChars);
        if (lastParagraph > maxChars * 0.5) {
            splitAt = lastParagraph + 2;
        } else {
            // Fall back to splitting at a single newline
            const lastNewline = remaining.lastIndexOf('\n', maxChars);
            if (lastNewline > maxChars * 0.5) {
                splitAt = lastNewline + 1;
            }
        }
        
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt);
    }
    
    if (remaining.length > 0) {
        chunks.push(remaining);
    }
    
    return chunks;
}

// ─── File discovery ───────────────────────────────────────────────────────────

function getFilesToTranslate() {
    const files = [];
    const localesToProcess = LOCALE_FILTER 
        ? [LOCALE_FILTER] 
        : Object.keys(LOCALES);
    const dirsToProcess = DIR_FILTER 
        ? [DIR_FILTER] 
        : TARGET_DIRS;

    for (const locale of localesToProcess) {
        if (!LOCALES[locale]) {
            console.error(`Unknown locale: ${locale}. Valid locales: ${Object.keys(LOCALES).join(', ')}`);
            process.exit(1);
        }

        for (const dir of dirsToProcess) {
            const sourceDir = path.join(DOCS_BASE, dir);
            if (!fs.existsSync(sourceDir)) continue;

            const localeDir = path.join(I18N_BASE, locale, PLUGIN_DIR, dir);

            const sourceFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.md'));
            for (const file of sourceFiles) {
                const sourceFile = path.join(sourceDir, file);
                const localeFile = path.join(localeDir, file);

                if (!fs.existsSync(localeFile)) {
                    console.warn(`  MISSING: ${locale}/${dir}/${file} (no locale file found)`);
                    continue;
                }

                if (needsTranslation(localeFile, sourceFile)) {
                    files.push({
                        locale,
                        dir,
                        file,
                        sourceFile,
                        localeFile,
                        language: LOCALES[locale],
                    });
                }
            }
        }
    }

    return files;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Ever Works Docs Translation Script ===\n');
    console.log(`Model: ${MODEL}`);
    console.log(`Delay: ${DELAY_MS}ms between requests`);
    console.log(`Filters: locale=${LOCALE_FILTER || 'all'}, dir=${DIR_FILTER || 'all'}`);
    if (DRY_RUN) console.log('DRY RUN: No files will be modified\n');
    console.log('');

    console.log('Scanning for files that need translation...');
    const filesToTranslate = getFilesToTranslate();

    if (filesToTranslate.length === 0) {
        console.log('✓ All files appear to be already translated!');
        return;
    }

    console.log(`Found ${filesToTranslate.length} files needing full translation:\n`);
    
    // Group by locale for display
    const byLocale = {};
    for (const f of filesToTranslate) {
        if (!byLocale[f.locale]) byLocale[f.locale] = [];
        byLocale[f.locale].push(`${f.dir}/${f.file}`);
    }
    for (const [locale, files] of Object.entries(byLocale)) {
        console.log(`  ${locale} (${LOCALES[locale]}): ${files.length} files`);
    }
    console.log('');

    if (DRY_RUN) {
        console.log('Dry run complete. Pass --locale <code> --dir <dir> to process a subset first.');
        return;
    }

    let processed = 0;
    let failed = 0;
    const startTime = Date.now();

    for (const { locale, dir, file, sourceFile, localeFile, language } of filesToTranslate) {
        processed++;
        const progress = `[${processed}/${filesToTranslate.length}]`;
        console.log(`${progress} Translating ${locale}/${dir}/${file} → ${language}`);

        try {
            const sourceContent = fs.readFileSync(sourceFile, 'utf8');
            const translated = await translateFile(sourceContent, language, `${dir}/${file}`);
            
            if (!translated || translated.length < 50) {
                throw new Error('Translation returned empty or too-short result');
            }

            fs.writeFileSync(localeFile, translated, 'utf8');
            console.log(`  ✓ Written (${translated.length} chars)`);
        } catch (err) {
            failed++;
            console.error(`  ✗ Failed: ${err.message}`);
        }

        if (processed < filesToTranslate.length) {
            await sleep(DELAY_MS);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== Done in ${elapsed}s: ${processed - failed} translated, ${failed} failed ===`);
    
    if (failed > 0) {
        console.log('Re-run the script to retry failed files.');
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
