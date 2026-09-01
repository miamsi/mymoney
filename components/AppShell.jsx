'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { monthStr } from '@/lib/format';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import ManualPanel from '@/components/ManualPanel';
import SlotManager from '@/components/SlotManager';

export default function AppShell({ user }) {
  const [month, setMonth] = useState(monthStr());
  const [monthId, setMonthId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [tab, setTab] = useState('chat');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMonth = useCallback(async (m) => {
    let { data: monthRow } = await supabase.from('budget_months').select('*').eq('month', m).maybeSingle();
    if (!monthRow) {
      const { data: created, error } = await supabase.from('budget_months').insert({ month: m }).select().single();
      if (error) {
        console.error(error);
        return;
      }
      monthRow = created;
    }
    setMonthId(monthRow.id);

    const { data: slotRows } = await supabase
      .from('budget_slots')
      .select('*')
      .eq('month_id', monthRow.id)
      .order('sort_order', { ascending: true });
    const list = slotRows || [];

    const spentMap = {};
    if (list.length) {
      const ids = list.map((s) => s.id);
      const { data: txRows } = await supabase.from('transactions').select('slot_id, amount').in('slot_id', ids);
      (txRows || []).forEach((t) => {
        spentMap[t.slot_id] = (spentMap[t.slot_id] || 0) + Number(t.amount);
      });
    }

    setSlots(list.map((s) => ({ ...s, spent: spentMap[s.id] || 0 })));
  }, []);

  useEffect(() => {
    loadMonth(month);
  }, [month, refreshKey, loadMonth]);

  const refresh = () => setRefreshKey((k) => k + 1);

  async function addTransaction({ slotId, amount, note, date, source }) {
    const { error } = await supabase
      .from('transactions')
      .insert({ slot_id: slotId, amount, note: note || '', tx_date: date, source: source || 'manual' });
    if (error) throw error;
    refresh();
  }

  async function addSlot({ name, type, budget_limit }) {
    const { error } = await supabase
      .from('budget_slots')
      .insert({ month_id: monthId, name, type, budget_limit, sort_order: slots.length });
    if (error) throw error;
    refresh();
  }

  async function updateSlot(id, patch) {
    const { error } = await supabase.from('budget_slots').update(patch).eq('id', id);
    if (error) throw error;
    refresh();
  }

  async function deleteSlot(id) {
    const { error } = await supabase.from('budget_slots').delete().eq('id', id);
    if (error) throw error;
    refresh();
  }

  async function duplicatePreviousMonth() {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = monthStr(prevDate);
    const { data: prevRow } = await supabase.from('budget_months').select('id').eq('month', prevMonth).maybeSingle();
    if (!prevRow) return;
    const { data: prevSlots } = await supabase.from('budget_slots').select('*').eq('month_id', prevRow.id);
    if (!prevSlots || !prevSlots.length) return;
    const rows = prevSlots.map((s, i) => ({
      month_id: monthId,
      name: s.name,
      type: s.type,
      budget_limit: s.budget_limit,
      sort_order: i,
    }));
    const { error } = await supabase.from('budget_slots').insert(rows);
    if (error) throw error;
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} month={month} setMonth={setMonth} slots={slots} tab={tab} setTab={setTab} onSignOut={signOut} />
      <main className="flex-1 h-screen overflow-hidden">
        {tab === 'chat' && <ChatPanel month={month} slots={slots} onConfirmTransaction={addTransaction} />}
        {tab === 'manual' && <ManualPanel month={month} slots={slots} onAddTransaction={addTransaction} />}
        {tab === 'slots' && (
          <SlotManager
            slots={slots}
            onAddSlot={addSlot}
            onUpdateSlot={updateSlot}
            onDeleteSlot={deleteSlot}
            onDuplicate={duplicatePreviousMonth}
          />
        )}
      </main>
    </div>
  );
}
