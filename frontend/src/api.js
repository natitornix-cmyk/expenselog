export async function getMembers() {
  const res = await fetch('/api/members');
  return res.json();
}

export async function addMember(name) {
  const res = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteMember(id) {
  const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getExpenses() {
  const res = await fetch('/api/expenses');
  return res.json();
}

export async function createExpense(data) {
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateExpense(id, data) {
  const res = await fetch(`/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteExpense(id) {
  const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getBalances() {
  const res = await fetch('/api/balances');
  return res.json();
}
