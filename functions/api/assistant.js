/**
 * Cloudflare Pages Function — POST /api/assistant
 *
 * This is the only place the AI key is ever read. Set it in the Cloudflare
 * dashboard under Settings → Variables and Secrets (encrypt it), never in the
 * repository:
 *
 *   AI_PROVIDER = anthropic | gemini | openai_compatible | mock
 *   AI_API_KEY  = <secret>            (encrypted)
 *   AI_MODEL    = <optional override>
 *   AI_BASE_URL = <only for openai_compatible: Groq, OpenRouter, …>
 *
 * With nothing set, GET returns enabled:false and the app runs its
 * deterministic assistant exactly as before.
 */

import { askProvider, readConfig } from '../../server/aiCore.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

/** Feature detection: the browser asks whether an AI layer exists here. */
export async function onRequestGet(context) {
  const config = readConfig(context.env ?? {});
  return new Response(
    JSON.stringify({ ok: true, enabled: config.enabled, provider: config.enabled ? config.provider : null }),
    { headers: JSON_HEADERS },
  );
}

export async function onRequestPost(context) {
  const config = readConfig(context.env ?? {});
  if (!config.enabled) {
    return new Response(JSON.stringify({ ok: false, enabled: false, error: 'AI layer not configured.' }), {
      status: 503,
      headers: JSON_HEADERS,
    });
  }

  let payload;
  try {
    const raw = await context.request.text();
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
