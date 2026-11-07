// Build-time site git-token resolver for scripts/clone.cjs (spec 054).
/**
 * The data-repo token for this build: a fresh one-repo token from the Ever Works
 * site git-token broker when EVER_WORKS_SITE_GIT_TOKEN_URL and
 * EVER_WORKS_SITE_GIT_TOKEN_SECRET are set, else GH_TOKEN (which may be an
 * expired bootstrap token once the broker is in use). The build-time
 * twin of lib/git/site-git-token.ts (CommonJS, so scripts/clone.cjs can require it);
 * covered by scripts/site-git-token.spec.ts.
 */
function isSafeBrokerUrl(value) {
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "https:" || (local && url.protocol === "http:");
  } catch {
    return false;
  }
}

async function resolveSiteGitToken(env = process.env, fetchImpl = globalThis.fetch) {
  const staticToken = (env.GH_TOKEN || "").trim();
  const brokerUrl = (env.EVER_WORKS_SITE_GIT_TOKEN_URL || "").trim();
  const brokerSecret = (env.EVER_WORKS_SITE_GIT_TOKEN_SECRET || "").trim();
  if (!brokerUrl || !brokerSecret) return staticToken;
  // The site secret is a bearer: https only (http only for a local platform).
  if (!isSafeBrokerUrl(brokerUrl)) {
    console.warn("Site git token broker URL is not https; using GH_TOKEN.");
    return staticToken;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(brokerUrl, {
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

module.exports = { resolveSiteGitToken };
