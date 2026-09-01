'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatIDR, todayStr } from '@/lib/format';

export default function ManualPanel({ slots, onAddTransaction }) {
  const [direction, setDirection] = useState('expense');
  const [slotId, setSlotId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);

  const filteredSlots = slots.filter((s) => s.type === direction);

  useEffect(() => {
    setSlotId(filteredSlots[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, slots.length]);

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  async function loadRecent() {
    const ids = slots.map((s) => s.id);
    if (!ids.length) {
      setRecent([]);
      return;
    }
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .in('slot_id', ids)
      .order('tx_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);
    setRecent(data || []);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!slotId) {
      setError('Pick a slot first (create one under Slots if none exist).');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setBusy(true);
    try {
      await onAddTransaction({ slotId, amount: amt, note, date, source: 'manual' });
      setAmount('');
      setNote('');
      loadRecent();
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const slotName = (id) => slots.find((s) => s.id === id)?.name || '—';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <form onSubmit={submit} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex gap-2">
            {['expense', 'income'].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDirection(d)}
                className={`flex-1 text-xs py-1.5 rounded-lg ${direction === d ? 'bg-white text-black' : 'bg-white/10 text-white/60'}`}
              >
                {d === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <select
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
          >
            <option value="">Select a slot…</option>
            {filteredSlots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="any"
            min="0"
            placeholder="Amount (IDR)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/30"
          />

          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/30"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button disabled={busy} className="w-full rounded-xl bg-white text-black text-sm font-medium py-2 disabled:opacity-50">
            {busy ? 'Saving…' : 'Add transaction'}
          </button>
        </form>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/30 mb-2 px-1">Recent</p>
          <div className="space-y-1.5">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs glass rounded-xl px-3 py-2 gap-3">
                <div className="min-w-0">
                  <p className="text-white/80 truncate">{t.note || slotName(t.slot_id)}</p>
                  <p className="text-white/30">
                    {slotName(t.slot_id)} · {t.tx_date} · {t.source}
                  </p>
                </div>
                <span className="text-white/70 shrink-0">{formatIDR(t.amount)}</span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-xs text-white/30 px-1">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
