const { loadEnvConfig } = require("@next/env");
const git = require("isomorphic-git")
const http = require("isomorphic-git/http/node")
const fs = require("node:fs")
const path = require("node:path")
const os = require('node:os')

loadEnvConfig(process.cwd());

const url = process.env.DATA_REPOSITORY;

/**
 * The data-repo token for this build: a fresh one-repo token from the Ever Works
 * site git-token broker when EVER_WORKS_SITE_GIT_TOKEN_URL and
 * EVER_WORKS_SITE_GIT_TOKEN_SECRET are set, else GH_TOKEN (which may be an
 * expired bootstrap token once the broker is in use). Mirrors
 * lib/git/site-git-token.ts, which this CommonJS script cannot import.
 */
async function resolveToken() {
  const staticToken = (process.env.GH_TOKEN || "").trim();
  const brokerUrl = (process.env.EVER_WORKS_SITE_GIT_TOKEN_URL || "").trim();
  const brokerSecret = (process.env.EVER_WORKS_SITE_GIT_TOKEN_SECRET || "").trim();
  if (!brokerUrl || !brokerSecret) return staticToken;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(brokerUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${brokerSecret}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`broker answered ${response.status}`);
    const body = await response.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) throw new Error("broker answered without a token");
    return token;
  } catch (err) {
    // Never log the secret or a token.
    console.warn(`Site git token broker unavailable (${err && err.message ? err.message : err}); using GH_TOKEN.`);
    return staticToken;
  } finally {
    clearTimeout(timer);
  }
}

if (!url) {
  console.warn("Warning: 'DATA_REPOSITORY' environment variable is missing.");
  console.warn("Content repository will not be cloned. Some content may not be available.");
  process.exit(0); // Exit gracefully without error
}


function getContentPath() {
  const contentDir = '.content';
  // Always use project directory during build to ensure content is included in deployment
  return path.join(process.cwd(), contentDir);
}

const dest = getContentPath();

async function main() {
  const token = await resolveToken();
  const auth = { username: "x-access-token", password: token };
  await fs.promises.mkdir(dest, { recursive: true });

  // If already cloned, pull the latest content instead of skipping.
  const gitDir = path.join(dest, '.git');
  if (fs.existsSync(gitDir)) {
    console.log("Content repo already present, pulling latest changes:", dest);

    const pullOptions = {
      fs,
      http,
      url,
      dir: dest,
      author: { name: "website" },
      singleBranch: true,
    };

    if (token) {
      pullOptions.onAuth = () => auth;
    }

    await git.pull(pullOptions);
    return;
  }

  console.log("Cloning content repository to", dest);

  const cloneOptions = {
    fs,
    http,
    url,
    dir: dest,
    singleBranch: true,
  }

  if (token) {
    cloneOptions.onAuth = () => auth;
  }

  await git.clone(cloneOptions);
}

main().catch(err => {
  console.warn("Continuing build without content repository.", err);
  process.exit(0);
});
