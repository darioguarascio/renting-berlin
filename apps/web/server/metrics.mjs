import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register, prefix: 'renting_berlin_' });

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const emailsSentTotal = new promClient.Counter({
  name: 'emails_sent_total',
  help: 'Emails sent directly from the web process',
  labelNames: ['category', 'status'],
  registers: [register],
});

const emailSendDurationSeconds = new promClient.Histogram({
  name: 'email_send_duration_seconds',
  help: 'Email send duration in seconds (web process)',
  labelNames: ['category', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

const postsPublishedTotal = new promClient.Counter({
  name: 'posts_published_total',
  help: 'Content published and visible on the site',
  labelNames: ['type'],
  registers: [register],
});

function normalizeRoute(path) {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9a-f]{24}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

function isPrivateIp(ip) {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, '');
  if (normalized === '127.0.0.1' || normalized === '::1') return true;
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

export function metricsEnabled() {
  return process.env.METRICS_ENABLED !== '0';
}

export function metricsMiddleware(req, res, next) {
  if (!metricsEnabled() || req.path === '/metrics') {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: normalizeRoute(req.path || 'unknown'),
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    const elapsedNs = Number(process.hrtime.bigint() - start);
    httpRequestDurationSeconds.observe(labels, elapsedNs / 1e9);
  });
  next();
}

export function metricsAccessAllowed(req) {
  if (process.env.METRICS_PUBLIC === '1') return true;
  return isPrivateIp(req.ip);
}

export async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export function recordEmailSend(category, status, durationSeconds) {
  if (!metricsEnabled()) return;
  const labels = { category, status };
  emailsSentTotal.inc(labels);
  if (durationSeconds != null) {
    emailSendDurationSeconds.observe(labels, durationSeconds);
  }
}

export function recordPostPublished(type) {
  if (!metricsEnabled()) return;
  postsPublishedTotal.inc({ type });
}
