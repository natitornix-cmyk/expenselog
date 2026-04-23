import { supabase } from './supabase';

export async function getMembers() {
  const { data, error } = await supabase.from('members').select('*').order('id');
  if (error) throw new Error(error.message);
  return data;
}

export async function addMember(name) {
  const { data, error } = await supabase
    .from('members')
    .insert({ name })
    .select()
    .single();
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

export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id, date, description, paid_by, notes, created_at,
      paid_by_member:members!paid_by(name),
      splits:expense_splits(member_id, amount, member:members!member_id(name))
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
  }));
}

export async function createExpense({ date, description, paid_by, splits, notes }) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ date, description, paid_by, notes: notes ?? '' })
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
  const { error } = await supabase
    .from('expenses')
    .update({ date, description, paid_by, notes: notes ?? '' })
    .eq('id', id);
  if (error) throw new Error(error.message);

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
