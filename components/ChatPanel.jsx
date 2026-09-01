'use client';

import { useEffect, useRef, useState } from 'react';
import { sanitizeAIText } from '@/lib/sanitize';
import { formatIDR, todayStr } from '@/lib/format';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  kind: 'text',
  text:
    'Tell me what you spent or earned, e.g. "beli kopi 24000" or "gaji masuk 2798600". I will match it to a slot and ask you to confirm before saving anything.',
};

export default function ChatPanel({ month, slots, onConfirmTransaction }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const userMsg = { id: crypto.randomUUID(), role: 'user', kind: 'text', text };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    // Only a short rolling window is sent to the server, not the whole thread.
    const lastMessages = [...messages, userMsg]
      .filter((m) => m.kind === 'text')
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          month,
          slots: slots.map((s) => ({ name: s.name, type: s.type, budget_limit: s.budget_limit, spent: s.spent })),
          lastMessages,
        }),
      });
      const data = await res.json();

      if (data.type === 'transaction') {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            kind: 'confirm',
            draft: {
              direction: data.direction === 'income' ? 'income' : 'expense',
              amount: Number(data.amount) || 0,
              slotName: data.slot || null,
              note: data.note || '',
              date: /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : todayStr(),
            },
          },
        ]);
      } else if (data.type === 'error') {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'assistant', kind: 'error', text: data.text || 'Something went wrong.' },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'assistant', kind: 'text', text: sanitizeAIText(data.text || '') },
        ]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', kind: 'error', text: 'Could not reach the AI. Use Manual mode to keep recording.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDraft(msgId, draft) {
    const slot = slots.find((s) => s.name.toLowerCase() === (draft.slotName || '').toLowerCase());
    if (!slot) {
      setMessages((m) => m.map((mm) => (mm.id === msgId ? { ...mm, kind: 'confirm', draft, needsSlot: true } : mm)));
      return;
    }
    try {
      await onConfirmTransaction({ slotId: slot.id, amount: draft.amount, note: draft.note, date: draft.date, source: 'ai' });
      setMessages((m) =>
        m.map((mm) =>
          mm.id === msgId ? { id: msgId, role: 'assistant', kind: 'saved', text: `Saved ${formatIDR(draft.amount)} to ${slot.name}.` } : mm
        )
      );
    } catch (e) {
      setMessages((m) => m.map((mm) => (mm.id === msgId ? { ...mm, kind: 'error', text: 'Could not save that transaction.' } : mm)));
    }
  }

  function dismissDraft(msgId) {
    setMessages((m) => m.map((mm) => (mm.id === msgId ? { id: msgId, role: 'assistant', kind: 'text', text: 'Okay, not saved.' } : mm)));
  }

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} slots={slots} onConfirm={confirmDraft} onDismiss={dismissDraft} />
          ))}
          {busy && <div className="text-xs text-white/30 px-1">Thinking…</div>}
        </div>
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl flex items-end gap-2 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Record a spend, income, or ask about your budget…"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm px-2 py-2 placeholder:text-white/30 max-h-32"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-xl bg-white text-black text-sm font-medium px-4 py-2 disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, slots, onConfirm, onDismiss }) {
  if (msg.kind === 'confirm') {
    const { draft, needsSlot } = msg;
    return (
      <div className="glass rounded-2xl p-4 max-w-md">
        <p className="text-xs text-white/40 mb-2">{draft.direction === 'income' ? 'Income' : 'Expense'} detected</p>
        <p className="text-sm text-white/90">
          {formatIDR(draft.amount)} — {draft.note || 'no note'}
        </p>
        <p className="text-xs text-white/40 mt-1">{draft.date}</p>
        {needsSlot ? (
          <div className="mt-3">
            <p className="text-xs text-amber-300/80 mb-2">Could not match a slot automatically. Pick one:</p>
            <div className="flex flex-wrap gap-1.5">
              {slots
                .filter((s) => s.type === (draft.direction === 'income' ? 'income' : 'expense'))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onConfirm(msg.id, { ...draft, slotName: s.name })}
                    className="text-xs rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1"
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button onClick={() => onConfirm(msg.id, draft)} className="text-xs rounded-lg bg-white text-black px-3 py-1.5 font-medium">
              Confirm{draft.slotName ? ` → ${draft.slotName}` : ''}
            </button>
            <button onClick={() => onDismiss(msg.id)} className="text-xs rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5">
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  if (msg.kind === 'saved') {
    return <div className="text-xs text-emerald-300/80 px-1">{msg.text}</div>;
  }

  if (msg.kind === 'error') {
    return <div className="glass rounded-2xl p-3 max-w-md text-xs text-red-300/90">{msg.text}</div>;
  }

  return (
    <div
      className={`max-w-md rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
        msg.role === 'user' ? 'bg-white text-black ml-auto' : 'glass text-white/85'
      }`}
    >
      {msg.text}
    </div>
  );
}
