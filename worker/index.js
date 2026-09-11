/**
 * Cloudflare Worker entry point.
 *
 * Serves the built site from the ASSETS binding and handles /api/assistant with
 * the same shared logic as the Pages Function and the Node server — one copy of
 * the prompt and the provider adapters, three ways to deploy it.
 *
 * The AI key is read from the Worker's environment (add it as an encrypted
 * secret in the dashboard, or with `npx wrangler secret put AI_API_KEY`). It is
 * never sent to the browser. With no key configured, GET returns enabled:false
 * and the app runs its deterministic assistant.
 */

import { askProvider, readConfig } from '../server/aiCore.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/assistant') {
      const config = readConfig(env ?? {});

      if (request.method === 'GET') {
        return Response.json(
          { ok: true, enabled: config.enabled, provider: config.enabled ? config.provider : null },
          { headers: JSON_HEADERS },
        );
      }

      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'Use POST.' }), {
          status: 405,
          headers: JSON_HEADERS,
        });
      }

      if (!config.enabled) {
        return new Response(JSON.stringify({ ok: false, enabled: false, error: 'AI layer not configured.' }), {
          status: 503,
          headers: JSON_HEADERS,
        });
      }

      let payload;
      try {
        const raw = await request.text();
        if (raw.length > 24_000) {
          return new Response(JSON.stringify({ ok: false, error: 'Request too large.' }), {
            status: 413,
            headers: JSON_HEADERS,
          });
        }
        payload = JSON.parse(raw);
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body.' }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }

      const result = await askProvider({
        config,
        question: payload?.question,
        incident: payload?.incident ?? null,
        history: Array.isArray(payload?.history) ? payload.history : [],
      });

      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 502,
        headers: JSON_HEADERS,
      });
    }

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
