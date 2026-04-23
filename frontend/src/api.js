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

// ─── Auth / User Links ────────────────────────────────────────────────────────

export async function getMyLink() {
  const { data, error } = await supabase
    .from('user_links').select('member_id').single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data ?? null;
}

export async function getClaimedMemberIds() {
  const { data, error } = await supabase.from('user_links').select('member_id');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => r.member_id);
}

export async function linkUserToMember(userId, memberId) {
  const { error } = await supabase
    .from('user_links').insert({ user_id: userId, member_id: memberId });
  if (error) {
    if (error.code === '23505') throw new Error('สมาชิกนี้ถูกเชื่อมกับบัญชี Google อื่นแล้ว');
    throw new Error(error.message);
  }
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id, date, description, paid_by, notes, created_at, created_by,
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

export async function createExpense({ date, description, paid_by, splits, notes, created_by }) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ date, description, paid_by, notes: notes ?? '', created_by })
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
  return expense;
}

export async function updateExpense(id, { date, description, paid_by, splits, notes }) {
  const { data, error } = await supabase
    .from('expenses')
    .update({ date, description, paid_by, notes: notes ?? '' })
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
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
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
