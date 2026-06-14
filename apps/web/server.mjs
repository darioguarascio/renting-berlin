import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler as ssrHandler } from './dist/server/entry.mjs';
import httpLogger from './server/http-logger.mjs';
import {
  metricsAccessAllowed,
  metricsEnabled,
  metricsHandler,
  metricsMiddleware,
} from './server/metrics.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

if (process.env.HTTP_LOG !== '0') {
  app.use(httpLogger);
}

if (metricsEnabled()) {
  app.get('/metrics', (req, res, next) => {
    if (!metricsAccessAllowed(req)) {
      res.status(403).end('Forbidden');
      return;
    }
    next();
  }, metricsHandler);
  app.use(metricsMiddleware);
}

app.use(express.static(path.join(rootDir, 'dist/client')));
app.use(ssrHandler);

app.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});
