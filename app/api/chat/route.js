import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/groqPrompt';

export const runtime = 'nodejs';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, month, slots = [], lastMessages = [] } = body || {};

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ type: 'error', text: 'No message provided.' }, { status: 400 });
    }
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { type: 'error', text: 'AI is not configured on the server (missing GROQ_API_KEY). Use Manual mode.' },
        { status: 200 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const system = buildSystemPrompt(month, slots);

    // Only a short rolling window of prior turns is sent, plus a compact
    // snapshot of current slot balances (not the full chat history). This
    // keeps every request small and bounded in size, which is what avoids
    // the per-minute token/rate limit issues from resending growing history.
    const messages = [
      { role: 'system', content: system },
      ...lastMessages.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.text || '').slice(0, 500),
      })),
      { role: 'user', content: message.slice(0, 1000) },
    ];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { type: 'reply', text: raw };
    }
    if (!parsed.type) parsed.type = 'reply';

    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const rateLimited = status === 429;
    return NextResponse.json(
      {
        type: 'error',
        text: rateLimited
          ? 'AI hit a rate limit. Wait a moment and try again, or use Manual mode.'
          : 'AI request failed. Use Manual mode to keep recording.',
      },
      { status: 200 }
    );
  }
}
