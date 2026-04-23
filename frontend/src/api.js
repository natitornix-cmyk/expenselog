import { supabase } from './supabase';

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getMembers() {
  const { data, error } = await supabase.from('members').select('*').order('id');
  if (error) throw new Error(error.message);
  return data;
}

export async function addMember(name) {
  const { data, error } = await supabase
    .from('members').insert({ name }).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('มีชื่อนี้อยู่แล้ว');
    throw new Error(error.message);
  }
  return data;
}

export async function deleteMember(id) {
  const [{ data: inExpenses }, { data: inSplits }] = await Promise.all([
    supabase.from('expenses').select('id').eq('paid_by', id).limit(1),
    supabase.from('expense_splits').select('id').eq('member_id', id).limit(1),
  ]);
  if (inExpenses?.length || inSplits?.length) {
    throw new Error('ไม่สามารถลบได้ เพราะมีรายการค่าใช้จ่ายที่เกี่ยวข้องอยู่');
  }
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── User Profile ─────────────────────────────────────────────────────────────
// Each Google user creates their own member row (user_id column links them).

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('members')
    .select('id, name, user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createMyProfile(nickname) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('members')
    .insert({ name: nickname.trim(), user_id: user.id })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('ชื่อเล่นนี้มีคนใช้แล้ว');
    throw new Error(error.message);
  }
  return data;
}

export async function updateMyNickname(nickname) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('members')
    .update({ name: nickname.trim() })
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function deleteMyAccount(memberId) {
  const [{ data: inExpenses }, { data: inSplits }] = await Promise.all([
    supabase.from('expenses').select('id').eq('paid_by', memberId).limit(1),
    supabase.from('expense_splits').select('id').eq('member_id', memberId).limit(1),
  ]);
  if (inExpenses?.length || inSplits?.length)
    throw new Error('ไม่สามารถลบได้ เพราะมีรายการค่าใช้จ่ายที่เกี่ยวข้องอยู่');
  const { data, error } = await supabase
    .from('members').delete().eq('id', memberId).select();
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('ไม่มีสิทธิ์ลบ — กรุณาแก้ไข RLS policy ใน Supabase ก่อน (ดูคำแนะนำในแอป)');
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id, date, description, paid_by, notes, created_at, created_by, currency,
      paid_by_member:members!paid_by(name),
      splits:expense_splits(member_id, amount, member:members!member_id(name)),
      flags:expense_flags(id, note, resolved, member:members!member_id(name))
    `)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);

  return data.map(e => ({
    ...e,
    paid_by_name: e.paid_by_member?.name,
    splits: (e.splits ?? []).map(s => ({
      member_id: s.member_id,
      amount: s.amount,
      name: s.member?.name,
    })),
    total: (e.splits ?? []).reduce((sum, s) => sum + s.amount, 0),
    activeFlags: (e.flags ?? [])
      .filter(f => !f.resolved)
      .map(f => ({ id: f.id, note: f.note, flaggedBy: f.member?.name })),
  }));
}

function buildSnapshot(expense, splits, paidByName) {
  return {
    description: expense.description,
    date: expense.date,
    paid_by_name: paidByName,
    total: splits.reduce((s, x) => s + x.amount, 0),
    splits: splits.map(s => ({ name: s.name, amount: s.amount })),
  };
}

async function logAudit(expenseId, action, snapshot, byName) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('expense_audit').insert({
    expense_id: expenseId,
    action,
    changed_by: user.id,
    changed_by_name: byName,
    snapshot,
  });
}

export async function createExpense({ date, description, paid_by, splits, notes, currency, created_by, paid_by_name, my_name }) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ date, description, paid_by, notes: notes ?? '', currency: currency ?? 'THB', created_by })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const valid = splits.filter(s => s.amount > 0);
  if (valid.length) {
    const { error: se } = await supabase.from('expense_splits').insert(
      valid.map(s => ({ expense_id: expense.id, member_id: s.member_id, amount: s.amount }))
    );
    if (se) throw new Error(se.message);
  }

  await logAudit(expense.id, 'create', buildSnapshot({ date, description }, valid, paid_by_name), my_name);
  return expense;
}

export async function updateExpense(id, { date, description, paid_by, splits, notes, currency, paid_by_name, my_name }) {
  // Fetch old splits for audit snapshot before overwriting
  const { data: oldSplits } = await supabase
    .from('expense_splits')
    .select('amount, member:members!member_id(name)')
    .eq('expense_id', id);

  const { data: oldExpense } = await supabase
    .from('expenses')
    .select('description, date, paid_by_member:members!paid_by(name)')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('expenses')
    .update({ date, description, paid_by, notes: notes ?? '', currency: currency ?? 'THB' })
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('ไม่มีสิทธิ์แก้ไขรายการนี้');

  await supabase.from('expense_splits').delete().eq('expense_id', id);
  const valid = splits.filter(s => s.amount > 0);
  if (valid.length) {
    const { error: se } = await supabase.from('expense_splits').insert(
      valid.map(s => ({ expense_id: id, member_id: s.member_id, amount: s.amount }))
    );
    if (se) throw new Error(se.message);
  }

  const oldSnapshot = buildSnapshot(
    { description: oldExpense?.description, date: oldExpense?.date },
    (oldSplits ?? []).map(s => ({ name: s.member?.name, amount: s.amount })),
    oldExpense?.paid_by_member?.name
  );
  const newSnapshot = buildSnapshot({ date, description }, valid, paid_by_name);
  await logAudit(id, 'update', { old: oldSnapshot, new: newSnapshot }, my_name);
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getAuditLog(expenseId) {
  const { data, error } = await supabase
    .from('expense_audit')
    .select('id, action, changed_by_name, changed_at, snapshot')
    .eq('expense_id', expenseId)
    .order('changed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Flags ────────────────────────────────────────────────────────────────────

export async function flagExpense(expenseId, note, memberId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('expense_flags').insert({
    expense_id: expenseId,
    flagged_by: user.id,
    member_id: memberId,
    note,
  });
  if (error) throw new Error(error.message);
}

export async function resolveFlag(flagId) {
  const { error } = await supabase
    .from('expense_flags').update({ resolved: true }).eq('id', flagId);
  if (error) throw new Error(error.message);
}

// ─── Exchange Rates ───────────────────────────────────────────────────────────

export async function getExchangeRates() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('to_currency, rate')
    .eq('from_currency', 'THB');
  if (error) throw new Error(error.message);
  const result = {};
  for (const row of data ?? []) result[row.to_currency] = parseFloat(row.rate);
  return result; // e.g. { MYR: 0.13, SGD: 0.04 }
}

export async function upsertExchangeRate(toCurrency, rate) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('exchange_rates').upsert({
    from_currency: 'THB',
    to_currency: toCurrency,
    rate,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: 'from_currency,to_currency' });
  if (error) throw new Error(error.message);
}
