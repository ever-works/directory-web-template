/**
 * Kubernetes' startup probe for Ever Works sites requests `GET /` (the platform's k8s plugin
 * manifest: every 10 s, 10 s timeout, 30 tries). The home page lists the whole catalogue, so a
 * cold pod renders it only after reading every item, and on a busy node that read, together with
 * the start-up content sync, outlasts the probe's timeout again and again: pods were restarted
 * while they were only warming up (Spec 061). The probe asks whether the server is up, which
 * `/api/health` already answers for the readiness and liveness probes, so the proxy answers the
 * probe's `GET /` the same way and the content is warmed in the background (instrumentation.ts).
 *
 * Only `kube-probe/<version>` on `/` is short-circuited: visitors, crawlers and uptime monitors
 * still get the page.
 */
export function isStartupProbeRequest(pathname: string, userAgent: string | null | undefined): boolean {
	return pathname === '/' && typeof userAgent === 'string' && userAgent.startsWith('kube-probe/');
}
