#!/usr/bin/env node
/**
 * translate-docs-free.mjs
 *
 * Translates Docusaurus documentation files from English to multiple languages
 * using the free (no API key) Google Translate API.
 *
 * Strategy:
 * - Preserve ALL code blocks (``` ... ```) intact
 * - Protect inline code spans (`code`) during translation  
 * - Only translate prose, headings, table cells, list items
 * - In frontmatter, only translate title/sidebar_label VALUES; keep all keys as-is
 * - Handles Windows CRLF line endings correctly
 *
 * Usage (from apps/docs directory):
 *   node scripts/translate-docs-free.mjs
 *   node scripts/translate-docs-free.mjs --locale de
 *   node scripts/translate-docs-free.mjs --locale de --dir features
 *   node scripts/translate-docs-free.mjs --locale de --dir features --file collections.md
 *   node scripts/translate-docs-free.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Locale configuration ─────────────────────────────────────────────────────

const LOCALES = {
    ar: { google: 'ar',    name: 'Arabic' },
    bg: { google: 'bg',    name: 'Bulgarian' },
    de: { google: 'de',    name: 'German' },
    es: { google: 'es',    name: 'Spanish' },
    he: { google: 'iw',    name: 'Hebrew' },   // Google uses 'iw' for Hebrew
    it: { google: 'it',    name: 'Italian' },
    nl: { google: 'nl',    name: 'Dutch' },
    pl: { google: 'pl',    name: 'Polish' },
    pt: { google: 'pt',    name: 'Portuguese' },
    ru: { google: 'ru',    name: 'Russian' },
    zh: { google: 'zh-CN', name: 'Chinese (Simplified)' },
};

const TARGET_DIRS = ['features', 'advanced-guide', 'payment'];

const ROOT         = path.join(__dirname, '..');
const DOCS_SOURCE  = path.join(ROOT, '../../docs');
const I18N_BASE    = path.join(ROOT, 'i18n');
const PLUGIN_DIR   = 'docusaurus-plugin-content-docs-template/current';

// ─── CLI arguments ─────────────────────────────────────────────────────────────

const ARGS        = process.argv.slice(2);
const getArg      = (f) => { const i = ARGS.indexOf(f); return i !== -1 ? ARGS[i + 1] : null; };
const hasFlag     = (f) => ARGS.includes(f);

const LOCALE_FILTER = getArg('--locale');
const DIR_FILTER    = getArg('--dir');
const FILE_FILTER   = getArg('--file');
const DRY_RUN       = hasFlag('--dry-run');
const DELAY_MS      = parseInt(getArg('--delay') || '400', 10);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeLF(s) {
    return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── Frontmatter parsing ──────────────────────────────────────────────────────

/**
 * Parse YAML frontmatter from a Markdown file.
 * Returns { frontmatter: string, body: string } where frontmatter is the raw
 * YAML content (without the --- delimiters) and body is everything after.
 * Line endings are normalized to LF.
 */
function parseFrontmatter(raw) {
    const content = normalizeLF(raw);
    // Match: starts with ---, captures YAML block, then ---, then rest
    const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) return { frontmatter: null, body: content };
    return { frontmatter: m[1], body: m[2] };
}

function buildResult(frontmatter, body) {
    return `---\n${frontmatter}\n---\n${body}`;
}

// ─── Google Translate ─────────────────────────────────────────────────────────

async function gtranslateSingle(text, lang) {
    if (!text.trim()) return text;
    const url =
        'https://translate.googleapis.com/translate_a/single?' +
        `client=gtx&sl=en&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;

    const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; docs-i18n-bot/1.0)' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return (data[0] || []).filter(Boolean).map((c) => c[0] || '').join('');
}

/** Translate text, splitting into chunks if > 4500 chars. */
async function translateText(text, lang) {
    if (!text.trim()) return text;
    const MAX = 4500;
    if (text.length <= MAX) return await gtranslateSingle(text, lang);

    // Split at paragraph breaks
    const paras = text.split('\n\n');
    const chunks = [];
    let cur = '';
    for (const p of paras) {
        const candidate = cur ? cur + '\n\n' + p : p;
        if (candidate.length > MAX && cur) { chunks.push(cur); cur = p; }
        else cur = candidate;
    }
    if (cur) chunks.push(cur);

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
        results.push(await gtranslateSingle(chunks[i], lang));
        if (i < chunks.length - 1) await sleep(200);
    }
    return results.join('\n\n');
}

// ─── Frontmatter translation ──────────────────────────────────────────────────

/**
 * Translate only the VALUES of 'title' and 'sidebar_label' in YAML frontmatter.
 * All other keys are preserved exactly as-is (id, sidebar_position, etc.).
 */
async function translateFrontmatter(fm, lang) {
    const lines = fm.split('\n');
    const out = [];

    for (const line of lines) {
        // Match: key (title or sidebar_label), optional quotes, value
        const m = line.match(/^(title:\s*|sidebar_label:\s*)(["']?)(.*?)\2\s*$/);
        if (m) {
            const value = m[3];
            const translated = await translateText(value, lang);
            out.push(`${m[1]}${translated}`);
        } else {
            out.push(line); // Keep id, sidebar_position, and anything else verbatim
        }
    }

    return out.join('\n');
}

// ─── Markdown body translation ────────────────────────────────────────────────

/**
 * Split a markdown body into segments:
 * - 'code' : fenced code blocks (``` or ~~~) — never translated
 * - 'text' : everything else — gets translated
 */
function segmentBody(body) {
    const segments = [];
    // Regex to match fenced code blocks: opening fence = 3+ backticks or tildes
    // Capture group 1 = fence character sequence
    const FENCE = /^(```+|~~~+)[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm;

    let last = 0;
    for (const m of body.matchAll(FENCE)) {
        if (m.index > last) {
            segments.push({ type: 'text', text: body.slice(last, m.index) });
        }
        segments.push({ type: 'code', text: m[0] });
        last = m.index + m[0].length;
    }
    if (last < body.length) {
        segments.push({ type: 'text', text: body.slice(last) });
    }
    return segments;
}

/**
 * Protect inline code spans from Google Translate.
 * Replaces `code` with a private-use placeholder that GT won't translate.
 */
function protectInline(text) {
    const map = [];
    let n = 0;
    const out = text.replace(/`[^`\n]+`/g, (m) => {
        const tok = `\u{E000}${n++}\u{E001}`;
        map.push({ tok, original: m });
        return tok;
    });
    return { text: out, map };
}

function restoreInline(text, map) {
    let out = text;
    for (const { tok, original } of map) {
        const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace token (with optional surrounding spaces from GT) → original
        // Add a guard space only if needed by surrounding non-space chars
        out = out.replace(new RegExp(`(\\S?)(\\s*)${escaped}(\\s*)(\\S?)`, 'g'), (_, pre, spc1, spc2, post) => {
            const needLeft  = pre  && /\S/.test(pre)  ? ' ' : '';
            const needRight = post && /\S/.test(post) ? ' ' : '';
            return pre + needLeft + original + needRight + post;
        });
    }
    return out;
}

async function translateTextSegment(text, lang) {
    if (!text.trim()) return text;

    // Preserve exact leading + trailing whitespace (Google Translate strips it)
    const leadWS  = text.match(/^(\s*)/)[1];
    const trailWS = text.match(/(\s*)$/)[1];
    const inner   = text.slice(leadWS.length, text.length - trailWS.length || undefined);

    if (!inner.trim()) return text;

    const { text: prot, map } = protectInline(inner);
    const translated = await translateText(prot, lang);
    return leadWS + restoreInline(translated, map) + trailWS;
}

async function translateBody(body, lang) {
    const segs = segmentBody(body);
    const out = [];
    for (const seg of segs) {
        if (seg.type === 'code') {
            out.push(seg.text);
        } else {
            out.push(await translateTextSegment(seg.text, lang));
        }
    }
    return out.join('');
}

// ─── File translation ─────────────────────────────────────────────────────────

async function translateFile(srcPath, destPath, lang) {
    const raw = fs.readFileSync(srcPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);

    if (frontmatter === null) {
        // No frontmatter — translate entire file
        const result = await translateBody(normalizeLF(raw), lang);
        fs.writeFileSync(destPath, result, 'utf8');
        return result.length;
    }

    const [translatedFM, translatedBody] = await Promise.all([
        translateFrontmatter(frontmatter, lang),
        translateBody(body, lang),
    ]);

    const result = buildResult(translatedFM, translatedBody);
    fs.writeFileSync(destPath, result, 'utf8');
    return result.length;
}

// ─── File discovery ───────────────────────────────────────────────────────────

function extractFingerprint(body) {
    const lines = body.split('\n');
    let pastH1 = false;
    for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        if (!pastH1 && t.startsWith('# ')) { pastH1 = true; continue; }
        if (t.startsWith('#') || t.startsWith('```') || t.startsWith('|') || t.startsWith('    ')) continue;
        if (t.length >= 40 && /[a-zA-Z]/.test(t)) return t.slice(0, 60);
    }
    return null;
}

function needsTranslation(localePath, sourcePath) {
    if (!fs.existsSync(localePath)) return false;
    const src = fs.readFileSync(sourcePath, 'utf8');
    const loc = fs.readFileSync(localePath, 'utf8');
    const { body } = parseFrontmatter(src);
    const fp = extractFingerprint(body);
    if (!fp) return false;
    return normalizeLF(loc).includes(fp);
}

function getFiles() {
    const out = [];
    const locs = LOCALE_FILTER ? [LOCALE_FILTER] : Object.keys(LOCALES);
    const dirs = DIR_FILTER ? [DIR_FILTER] : TARGET_DIRS;

    for (const locale of locs) {
        if (!LOCALES[locale]) { console.error(`Unknown locale: ${locale}`); process.exit(1); }
        const { google, name } = LOCALES[locale];

        for (const dir of dirs) {
            const srcDir = path.join(DOCS_SOURCE, dir);
            if (!fs.existsSync(srcDir)) continue;
            const locDir = path.join(I18N_BASE, locale, PLUGIN_DIR, dir);

            fs.readdirSync(srcDir)
                .filter((f) => f.endsWith('.md') && (!FILE_FILTER || f === FILE_FILTER))
                .forEach((file) => {
                    const srcFile = path.join(srcDir, file);
                    const locFile = path.join(locDir, file);
                    if (needsTranslation(locFile, srcFile)) {
                        out.push({ locale, dir, file, srcFile, locFile, google, name });
                    }
                });
        }
    }

    return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Ever Works Docs — Free Translation (Google Translate) ===\n');
    console.log(`Filters : locale=${LOCALE_FILTER || 'all'}  dir=${DIR_FILTER || 'all'}${FILE_FILTER ? `  file=${FILE_FILTER}` : ''}`);
    console.log(`Delay   : ${DELAY_MS}ms between files`);
    if (DRY_RUN) console.log('MODE    : DRY RUN — no files written');
    console.log('');

    const files = getFiles();

    if (files.length === 0) {
        console.log('All files are already translated. Nothing to do.');
        return;
    }

    const byLocale = {};
    for (const f of files) { (byLocale[f.locale] = byLocale[f.locale] || []).push(`${f.dir}/${f.file}`); }
    console.log(`Found ${files.length} file(s):`);
    for (const [loc, list] of Object.entries(byLocale)) {
        console.log(`  ${loc} (${LOCALES[loc].name}) : ${list.length} file(s)`);
    }
    console.log('');

    if (DRY_RUN) return;

    let done = 0; let failed = 0;
    const t0 = Date.now();

    for (const { locale, dir, file, srcFile, locFile, google, name } of files) {
        done++;
        process.stdout.write(`[${done}/${files.length}] ${locale}/${dir}/${file}  →  ${name} ... `);
        try {
            const chars = await translateFile(srcFile, locFile, google);
            console.log(`OK (${chars} chars)`);
        } catch (e) {
            failed++;
            console.log(`FAILED: ${e.message}`);
        }
        if (done < files.length) await sleep(DELAY_MS);
    }

    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`\nFinished in ${mins} min  |  ${done - failed} succeeded  |  ${failed} failed`);
    if (failed) console.log('Re-run to retry failed files.');
}

main().catch((e) => { console.error(e); process.exit(1); });
