import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getConfig, PROJECT_ROOT } from './src/config/env.js';
import { getAqiReport, getCityOptions } from './src/services/aqiService.js';
import { generateChatReply } from './src/services/chatService.js';
import { generateRoutinePlan } from './src/services/routineService.js';
import { generateIndoorRecommendations } from './src/services/indoorService.js';

const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const MAX_JSON_BODY_BYTES = 64 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function sendJson(req, res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/**
 * Safely parses a JSON request body with a strict byte limit.
 */
async function readJsonBody(req) {
  let totalBytes = 0;
  const chunks = [];

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      const err = new Error('Request body too large.');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('Invalid JSON payload.');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Resolves a request pathname safely inside PUBLIC_DIR to prevent directory traversal.
 */
function resolvePublicPath(requestPathname) {
  const cleanPath = requestPathname === '/' ? '/index.html' : requestPathname;
  const decoded = decodeURIComponent(cleanPath);
  const candidate = path.resolve(PUBLIC_DIR, `.${decoded}`);

  if (candidate !== PUBLIC_DIR && !candidate.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    return null;
  }
  return candidate;
}

async function handleStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(req, res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  let filePath;
  try {
    filePath = resolvePublicPath(pathname);
  } catch {
    sendJson(req, res, 400, { ok: false, error: 'Malformed URL path' });
    return;
  }

  if (!filePath) {
    sendJson(req, res, 403, { ok: false, error: 'Access denied' });
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      sendJson(req, res, 404, { ok: false, error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await fs.readFile(filePath);

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      'Content-Length': data.length,
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      sendJson(req, res, 404, { ok: false, error: 'File not found' });
      return;
    }
    sendJson(req, res, 500, { ok: false, error: 'Internal server error' });
  }
}

/**
 * Creates the HTTP server instance (exported separately so tests can bind to port 0).
 */
export function createAppServer({ fetchImpl = fetch, config = getConfig() } = {}) {
  return http.createServer(async (req, res) => {
    const baseUrl = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url || '/', baseUrl);
    const { pathname, searchParams } = url;

    if (pathname === '/api/health') {
      sendJson(req, res, 200, {
        ok: true,
        service: 'SmogSaathi AI',
        version: '1.0.0',
        aiConfigured: Boolean(config.geminiApiKey),
        defaultAqiMode: config.defaultAqiMode,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/cities') {
      sendJson(req, res, 200, {
        ok: true,
        cities: getCityOptions(),
      });
      return;
    }

    if (pathname === '/api/aqi') {
      const cityKey = searchParams.get('city') || 'delhi';
      const mode = searchParams.get('mode') || config.defaultAqiMode;
      const scale = searchParams.get('scale') || 'us';

      try {
        const report = await getAqiReport({ cityKey, mode, scale, fetchImpl });
        sendJson(req, res, 200, report);
      } catch (err) {
        sendJson(req, res, err.statusCode || 500, {
          ok: false,
          error: err.message,
          canFallbackToDemo: Boolean(err.canFallbackToDemo),
        });
      }
      return;
    }

    if (pathname === '/api/chat') {
      if (req.method !== 'POST') {
        sendJson(req, res, 405, { ok: false, error: 'Method not allowed. Use POST.' });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const result = await generateChatReply({
          message: body.message,
          lang: body.lang,
          history: body.history,
          aqiContext: body.aqiContext,
          config,
          fetchImpl,
        });
        sendJson(req, res, 200, result);
      } catch (err) {
        sendJson(req, res, err.statusCode || 500, {
          ok: false,
          error: err.message,
        });
      }
      return;
    }

    if (pathname === '/api/routine') {
      if (req.method !== 'POST') {
        sendJson(req, res, 405, { ok: false, error: 'Method not allowed. Use POST.' });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const plan = await generateRoutinePlan({
          cityKey: body.city || 'delhi',
          mode: body.mode || config.defaultAqiMode,
          activityKey: body.activity || 'walking',
          preferredTimeKey: body.preferredTime || 'morning',
          durationMinutes: body.durationMinutes || 30,
          transportKey: body.transportMode || 'walk',
          fetchImpl,
        });
        sendJson(req, res, 200, plan);
      } catch (err) {
        sendJson(req, res, err.statusCode || 500, {
          ok: false,
          error: err.message,
          canFallbackToDemo: Boolean(err.canFallbackToDemo),
        });
      }
      return;
    }

    if (pathname === '/api/indoor') {
      if (req.method !== 'POST') {
        sendJson(req, res, 405, { ok: false, error: 'Method not allowed. Use POST.' });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const result = await generateIndoorRecommendations({
          cityKey: body.city || 'delhi',
          mode: body.mode || config.defaultAqiMode,
          scale: body.scale || 'us',
          hasPurifier: Boolean(body.hasPurifier),
          cookingFuel: body.cookingFuel || 'gas',
          sensitiveMembers: Boolean(body.sensitiveMembers),
          fetchImpl,
        });
        sendJson(req, res, 200, result);
      } catch (err) {
        sendJson(req, res, err.statusCode || 500, {
          ok: false,
          error: err.message,
          canFallbackToDemo: Boolean(err.canFallbackToDemo),
        });
      }
      return;
    }

    await handleStatic(req, res, pathname);
  });
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  const config = getConfig();
  const host = process.env.HOST || '0.0.0.0';
  const server = createAppServer({ config });
  server.listen(config.port, host, () => {
    console.log(`SmogSaathi AI running at http://localhost:${config.port} (bound ${host})`);
    console.log(
      `Default AQI mode: ${config.defaultAqiMode} | AI key configured: ${Boolean(config.geminiApiKey)}`
    );
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down SmogSaathi AI gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
