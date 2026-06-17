export async function recordPostPublished(type: 'listing' | 'tenant_request'): Promise<void> {
  if (process.env.METRICS_ENABLED === '0') return;

  try {
    const { pathToFileURL } = await import('node:url');
    const { join } = await import('node:path');
    const metricsUrl = pathToFileURL(join(process.cwd(), 'server/metrics.mjs')).href;
    const metrics = await import(/* @vite-ignore */ metricsUrl);
    metrics.recordPostPublished(type);
  } catch {
    // Metrics module unavailable outside the web runtime.
  }
}
