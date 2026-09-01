'use client';

import { useState } from 'react';
import { formatIDR } from '@/lib/format';

export default function SlotManager({ slots, onAddSlot, onUpdateSlot, onDeleteSlot, onDuplicate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAddSlot({ name: name.trim(), type, budget_limit: Number(limit) || 0 });
      setName('');
      setLimit('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/70">Manage this month&apos;s slots</p>
          <button onClick={onDuplicate} className="text-xs rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 shrink-0">
            Copy from previous month
          </button>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex gap-2">
            {['expense', 'income'].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 text-xs py-1.5 rounded-lg ${type === t ? 'bg-white text-black' : 'bg-white/10 text-white/60'}`}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
          <input
            placeholder="Slot name, e.g. daily consumption"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/30"
          />
          <input
            type="number"
            min="0"
            placeholder="Budget limit (IDR)"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/30"
          />
          <button disabled={busy} className="w-full rounded-xl bg-white text-black text-sm font-medium py-2 disabled:opacity-50">
            {busy ? 'Adding…' : 'Add slot'}
          </button>
        </form>

        <div className="space-y-2">
          {slots.map((s) => (
            <SlotEditRow key={s.id} slot={s} onUpdate={onUpdateSlot} onDelete={onDeleteSlot} />
          ))}
          {slots.length === 0 && <p className="text-xs text-white/30 px-1">No slots yet. Add one above, or copy from last month.</p>}
        </div>
      </div>
    </div>
  );
}

function SlotEditRow({ slot, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(slot.name);
  const [limit, setLimit] = useState(slot.budget_limit);

  async function save() {
    await onUpdate(slot.id, { name, budget_limit: Number(limit) || 0 });
    setEditing(false);
  }

  return (
    <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-3">
      {editing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
          />
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none"
          />
          <button onClick={save} className="text-xs text-emerald-300 shrink-0">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-white/40 shrink-0">
            Cancel
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/85 truncate">{slot.name}</p>
            <p className="text-xs text-white/30">
              {slot.type} · limit {formatIDR(slot.budget_limit)} · spent {formatIDR(slot.spent || 0)}
            </p>
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-white/40 hover:text-white/80 shrink-0">
            Edit
          </button>
          <button onClick={() => onDelete(slot.id)} className="text-xs text-red-400/70 hover:text-red-400 shrink-0">
            Delete
          </button>
        </>
      )}
    </div>
  );
}
