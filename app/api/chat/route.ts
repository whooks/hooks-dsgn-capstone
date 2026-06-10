import { createTextStreamResponse, simulateReadableStream } from 'ai';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { createN8nTextStream } from '@/lib/n8n-stream';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getZepClient } from '@/lib/zep/client';
import { retrieveUserContext, recordChatTurn } from '@/lib/zep/chat-memory';

// Allow responses up to 5 minutes (300s). The multi-agent RAG path runs ~20s+,
// and the web-fallback path (Tavily + Firecrawl) can take longer. Note: on
// serverless hosts this is a hint capped by your plan; local `next dev` doesn't
// enforce it.
export const maxDuration = 300;

// Cap the Zep context lookup so a slow memory service never stalls the reply.
const ZEP_CONTEXT_TIMEOUT_MS = 3000;

// We only need role + text parts; Zod strips any extra fields the AI SDK sends.
const uiMessageSchema = z.object({
  role: z.string(),
  parts: z
    .array(z.object({ type: z.string(), text: z.string().optional() }))
    .optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1),
  // Stable per-conversation id so the n8n AI Agent can keep memory across turns.
  // The client sends one; if absent we generate a fallback.
  sessionId: z.string().optional(),
});

type UiMessage = z.infer<typeof uiMessageSchema>;

function latestUserText(messages: UiMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser?.parts) return '';
  return lastUser.parts
    .map((p) => (p.type === 'text' && p.text ? p.text : ''))
    .join(' ')
    .trim();
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getSignedInUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

interface N8nProxyArgs {
  webhookUrl: string;
  userText: string;
  sessionId: string;
  messages: UiMessage[];
}

/**
 * Proxy the request to the n8n workflow and return its reply.
 *
 * The agent's output guardrail validates the COMPLETE answer inside n8n, so we
 * buffer the full reply here and then re-stream it word-by-word to the UI for a
 * typing effect — we can't stream before the guardrail has seen the whole text
 * (that's the deliberate trade-off for keeping the guardrail intact).
 *
 * Resolves the signed-in user once: its id is forwarded to n8n and, when Zep is
 * active, scopes the context lookup and the recorded turn. `getSignedInUser` is
 * try/caught and returns null on failure, so none of this can break the request.
 */
async function proxyToN8n(args: N8nProxyArgs): Promise<Response> {
  const { webhookUrl, userText, sessionId, messages } = args;
  const zep = getZepClient();
  const user = await getSignedInUser();
  const context = zep
    ? await retrieveUserContext(
        zep,
        sessionId,
        user?.id,
        ZEP_CONTEXT_TIMEOUT_MS
      )
    : '';

  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // n8n "Header Auth" credential — students configure a header named
        // API_KEY; its value is the server-side secret (never sent to the browser).
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { API_KEY: process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({
        message: userText,
        context,
        sessionId,
        userId: user?.id,
        messages,
      }),
    });
  } catch (error) {
    logger.error('n8n webhook unreachable', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return jsonError('Could not reach the n8n webhook', 502);
  }

  if (!upstream.ok || !upstream.body) {
    logger.error('n8n webhook returned an error', { status: upstream.status });
    return jsonError(`n8n webhook returned an error (${upstream.status})`, 502);
  }

  // n8n's AI Agent returns newline-delimited JSON envelopes; createN8nTextStream
  // extracts the clean reply text. We buffer the WHOLE reply (the output
  // guardrail has already run in n8n) before sending anything to the browser.
  const reader = upstream.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(createN8nTextStream())
    .getReader();
  let replyText = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) replyText += value;
    }
  } finally {
    reader.releaseLock();
  }

  // With Zep active, log the completed turn to the user's graph (the retrieved
  // `context` is never re-ingested — only the raw user/assistant text).
  if (zep && user && userText.trim() && replyText.trim()) {
    await recordChatTurn(zep, {
      supabaseUser: user,
      threadId: sessionId,
      userText,
      assistantText: replyText,
    });
  }

  // Re-stream the validated reply word-by-word so the chat types it out.
  const chunks = replyText.match(/\S+\s*/g) ?? [replyText];
  const textStream = simulateReadableStream({
    chunks,
    initialDelayInMs: 0,
    chunkDelayInMs: 20,
  });

  return createTextStreamResponse({ textStream });
}

/**
 * Streams an LLM agent response back to the UI.
 *
 * - If `N8N_WEBHOOK_URL` is set, this proxies the request to your n8n workflow
 *   and streams its response straight through. (The webhook URL/secret stay
 *   server-side and are never exposed to the browser.)
 * - Otherwise it streams a placeholder response so the chat UI works out of the
 *   box before n8n is connected.
 *
 * The response is a plain text stream consumed on the client by the AI SDK's
 * `TextStreamChatTransport` (see `app/chat/page.tsx`).
 */
export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError('Invalid request body: expected { messages: [...] }', 400);
  }

  const userText = latestUserText(parsed.data.messages);
  const sessionId = parsed.data.sessionId ?? crypto.randomUUID();
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  // ---- Real n8n agent: proxy the workflow and stream its response back ----
  if (webhookUrl) {
    return proxyToN8n({
      webhookUrl,
      userText,
      sessionId,
      messages: parsed.data.messages,
    });
  }

  // ---- Placeholder: stream a mock reply so the UI works before n8n ----
  const reply =
    `👋 **Placeholder response** from \`/api/chat\`.\n\n` +
    (userText ? `You said: _"${userText}"_\n\n` : '') +
    `To stream a real LLM agent, set \`N8N_WEBHOOK_URL\` in your \`.env.local\` ` +
    `to your n8n webhook. This route will then proxy and stream its response ` +
    `here token-by-token.`;

  const chunks = reply.match(/\S+\s*/g) ?? [reply];
  const textStream = simulateReadableStream({
    chunks,
    initialDelayInMs: 150,
    chunkDelayInMs: 35,
  });

  return createTextStreamResponse({ textStream });
}
