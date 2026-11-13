// Build-time site git-token resolver for scripts/clone.cjs (spec 054).
/** https only (plain http only for a local platform): the site secret is a bearer. */
function isSafeBrokerUrl(value) {
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "https:" || (local && url.protocol === "http:");
  } catch {
    return false;
  }
}

/**
 * The data-repo token for this build: a fresh one-repo token from the Ever Works
 * site git-token broker when EVER_WORKS_SITE_GIT_TOKEN_URL and
 * EVER_WORKS_SITE_GIT_TOKEN_SECRET are set, else GH_TOKEN (which may be an
 * expired bootstrap token once the broker is in use). The build-time
 * twin of lib/git/site-git-token.ts (CommonJS, so scripts/clone.cjs can require it);
 * covered by scripts/site-git-token.spec.ts.
 */
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

/**
 * The token is a GitHub credential: only https://github.com gets it (spec 054),
 * whatever DATA_REPOSITORY says. Plain http, another host (github.com.evil.com,
 * or evil.com behind `github.com@`), a port other than 443, or credentials of
 * the URL's own are all refused. Twin of isGitHubRemote in lib/git/site-git-token.ts.
 */
function isGitHubRemote(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.origin === "https://github.com" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * isomorphic-git `onAuth` for the build-time clone / pull: the token for the
 * remote isomorphic-git is about to call when that is https://github.com,
 * nothing otherwise (and nothing without a token, so there is no pointless retry).
 */
function gitHubOnlyOnAuth(token) {
  return (remoteUrl) =>
    token && isGitHubRemote(remoteUrl) ? { username: "x-access-token", password: token } : undefined;
}

module.exports = { resolveSiteGitToken, isGitHubRemote, gitHubOnlyOnAuth };
