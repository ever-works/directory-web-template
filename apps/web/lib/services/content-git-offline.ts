/**
 * Whether content-CMS git *remote* operations (clone / pull / push) should be
 * skipped because there is no reachable or meaningful remote.
 *
 * This is true in CI / e2e: the Playwright harness seeds a local `.content`
 * git stub whose `origin` points at an unreachable placeholder repo (it 401s),
 * so a per-request `pull()` on init and `push()` after a write are pointless
 * network round-trips. Worse, isomorphic-git applies no HTTP timeout, so those
 * round-trips sit on the request critical path and can blow past the e2e
 * navigation / redirect waits (the symptom: authenticated write flows —
 * create collection, submit item — timing out at ~30s). The local YAML write
 * still happens, and reads come from disk, so the app behaves correctly.
 *
 * Gated on `CI` (set by GitHub Actions for this template AND every downstream
 * `awesome-*` website repo, so no per-repo workflow change is needed) with an
 * explicit `CONTENT_GIT_OFFLINE` escape hatch. Production runtime (Vercel /
 * k8s serverless) does NOT set `CI`, so real content writes still pull/push as
 * before. Mirrors the read-path short-circuit added in d883149e.
 */
export function isContentGitRemoteDisabled(): boolean {
	return process.env.CI === 'true' || process.env.CONTENT_GIT_OFFLINE === 'true';
}
