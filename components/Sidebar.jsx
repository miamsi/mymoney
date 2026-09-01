'use client';

import { formatIDR } from '@/lib/format';

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Sidebar({ user, month, setMonth, slots, tab, setTab, onSignOut, open, onClose }) {
  const expenseSlots = slots.filter((s) => s.type === 'expense');
  const incomeSlots = slots.filter((s) => s.type === 'income');

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 z-30 bg-black/60 md:hidden" aria-hidden="true" />}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 max-w-[85vw] shrink-0 h-screen flex flex-col glass border-r border-white/10 transform transition-transform duration-200 ease-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold tracking-wide text-white/90">Budget Tracker</h1>
            <button onClick={onClose} className="md:hidden w-7 h-7 rounded-lg hover:bg-white/10 text-white/50 text-sm" aria-label="Close menu">
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/50 text-sm">
              ‹
            </button>
            <span className="text-sm text-white/80">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/50 text-sm">
              ›
            </button>
          </div>
        </div>

        <nav className="p-3 flex gap-1 border-b border-white/10">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'manual', label: 'Manual' },
            { id: 'slots', label: 'Slots' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                onClose();
              }}
              className={`flex-1 text-xs py-1.5 rounded-lg transition ${
                tab === t.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {expenseSlots.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/30 mb-2 px-1">Expense slots</p>
            <div className="space-y-2">
              {expenseSlots.map((s) => (
                <SlotRow key={s.id} slot={s} />
              ))}
            </div>
          </div>
        )}
        {incomeSlots.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/30 mb-2 px-1">Income</p>
            <div className="space-y-2">
              {incomeSlots.map((s) => (
                <SlotRow key={s.id} slot={s} />
              ))}
            </div>
          </div>
        )}
        {slots.length === 0 && <p className="text-xs text-white/30 px-1">No slots yet for this month. Go to Slots to add some.</p>}
      </div>

      <div className="p-3 border-t border-white/10 flex items-center justify-between gap-2">
        <span className="text-xs text-white/40 truncate">{user?.email}</span>
        <button onClick={onSignOut} className="text-xs text-white/40 hover:text-white/80 shrink-0">
          Sign out
        </button>
      </div>
      </aside>
    </>
  );
}

function SlotRow({ slot }) {
  const pct = slot.budget_limit > 0 ? Math.min(100, (slot.spent / slot.budget_limit) * 100) : 0;
  const over = slot.budget_limit > 0 && slot.spent > slot.budget_limit;
  const barColor = over ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="rounded-xl bg-white/5 border border-white/8 px-3 py-2">
      <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
        <span className="text-white/80 truncate">{slot.name}</span>
        <span className={`shrink-0 ${over ? 'text-red-300' : 'text-white/40'}`}>
          {formatIDR(slot.spent)} / {formatIDR(slot.budget_limit)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
