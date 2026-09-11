/**
 * SankatBrigade all-in-one server — zero dependencies.
 *
 * Serves the built `dist/` folder and, when an AI key is configured in the
 * environment, the same /api/assistant endpoint the Cloudflare Pages Function
 * provides. This is what runs inside the Docker image, and what `npm run
 * dev:ai` uses locally so the AI path can be tested before deploying.
 *
 *   PORT        default 8787
 *   AI_PROVIDER anthropic | gemini | openai_compatible | mock
 *   AI_API_KEY  the secret — read here, never sent to the browser
 *   AI_MODEL    optional override
 *   AI_BASE_URL only for openai_compatible (Groq, OpenRouter, …)
 *
 * With no AI variables set, the site still serves and the assistant runs in
 * deterministic mode.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { askProvider, readConfig } from './aiCore.mjs';

const PORT = Number(process.env.PORT || 8787);
const ROOT = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const config = readConfig(process.env);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

async function readBody(req, limit = 24_000) {
  return new Promise((resolveBody, rejectBody) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        rejectBody(new Error('too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolveBody(data));
    req.on('error', rejectBody);
  });
}

async function serveStatic(req, res, urlPath) {
  // Block path traversal, then fall back to index.html so deep links work.
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, safe);
  if (!filePath.startsWith(ROOT)) filePath = join(ROOT, 'index.html');

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(ROOT, 'index.html');
  }

  try {
    const file = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    const immutable = filePath.includes(`${join(ROOT, 'assets')}`);
    res.writeHead(200, {
      'content-type': type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found. Did you run `npm run build` first?');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/api/assistant') {
    if (req.method === 'GET') {
      sendJson(res, 200, { ok: true, enabled: config.enabled, provider: config.enabled ? config.provider : null });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Use POST.' });
      return;
    }
    if (!config.enabled) {
      sendJson(res, 503, { ok: false, enabled: false, error: 'AI layer not configured on this server.' });
      return;
    }
    try {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const result = await askProvider({
        config,
        question: payload.question,
        incident: payload.incident ?? null,
        history: Array.isArray(payload.history) ? payload.history : [],
      });
      sendJson(res, result.ok ? 200 : 502, result);
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid request body.' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  await serveStatic(req, res, decodeURIComponent(url.pathname));
});

server.listen(PORT, () => {
  console.log(`SankatBrigade serving ${ROOT}`);
  console.log(`  http://localhost:${PORT}`);
  console.log(
    config.enabled
      ? `  AI layer: ON (provider: ${config.provider}, model: ${config.model})`
      : '  AI layer: OFF — deterministic assistant only (set AI_PROVIDER and AI_API_KEY to enable)',
  );
});
