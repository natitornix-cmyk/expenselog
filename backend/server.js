const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Members ──────────────────────────────────────────────────────────────────

app.get('/api/members', (req, res) => {
  res.json(db.prepare('SELECT * FROM members ORDER BY id').all());
});

app.post('/api/members', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'ต้องระบุชื่อสมาชิก' });
  try {
    const result = db.prepare('INSERT INTO members (name) VALUES (?)').run(name.trim());
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'มีชื่อนี้อยู่แล้ว' });
    throw e;
  }
});

app.delete('/api/members/:id', (req, res) => {
  const id = Number(req.params.id);
  const inUse = db.prepare(
    'SELECT 1 FROM expenses WHERE paid_by = ? UNION SELECT 1 FROM expense_splits WHERE member_id = ?'
  ).get(id, id);
  if (inUse) return res.status(409).json({ error: 'ไม่สามารถลบได้ เพราะมีรายการค่าใช้จ่ายที่เกี่ยวข้องอยู่' });
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

app.get('/api/expenses', (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, m.name as paid_by_name
    FROM expenses e
    JOIN members m ON m.id = e.paid_by
    ORDER BY e.date DESC, e.id DESC
  `).all();

  const getSplits = db.prepare(`
    SELECT es.member_id, es.amount, m.name
    FROM expense_splits es
    JOIN members m ON m.id = es.member_id
    WHERE es.expense_id = ?
  `);

  for (const expense of expenses) {
    expense.splits = getSplits.all(expense.id);
    expense.total = expense.splits.reduce((sum, s) => sum + s.amount, 0);
  }

  res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
  const { date, description, paid_by, splits, notes } = req.body;
  if (!date || !description || !paid_by || !splits?.length) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }

  const id = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO expenses (date, description, paid_by, notes) VALUES (?, ?, ?, ?)'
    ).run(date, description, paid_by, notes ?? '');

    const insertSplit = db.prepare(
      'INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)'
    );
    for (const s of splits) {
      if (s.amount > 0) insertSplit.run(lastInsertRowid, s.member_id, s.amount);
    }
    return lastInsertRowid;
  })();

  res.json({ id });
});

app.put('/api/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const { date, description, paid_by, splits, notes } = req.body;

  db.transaction(() => {
    db.prepare(
      'UPDATE expenses SET date=?, description=?, paid_by=?, notes=? WHERE id=?'
    ).run(date, description, paid_by, notes ?? '', id);

    db.prepare('DELETE FROM expense_splits WHERE expense_id=?').run(id);

    const insertSplit = db.prepare(
      'INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)'
    );
    for (const s of splits) {
      if (s.amount > 0) insertSplit.run(id, s.member_id, s.amount);
    }
  })();

  res.json({ ok: true });
});

app.delete('/api/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ─── Balances ─────────────────────────────────────────────────────────────────

app.get('/api/balances', (req, res) => {
  const members = db.prepare('SELECT * FROM members').all();
  const splits = db.prepare(`
    SELECT es.member_id, es.amount, e.paid_by
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
  `).all();

  const balance = {};
  for (const m of members) balance[m.id] = 0;

  for (const s of splits) {
    balance[s.paid_by] = (balance[s.paid_by] ?? 0) + s.amount;
    balance[s.member_id] = (balance[s.member_id] ?? 0) - s.amount;
  }

  // Greedy debt settlement (min transactions)
  const debtors = members
    .filter(m => balance[m.id] < -0.01)
    .map(m => ({ ...m, amount: -balance[m.id] }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = members
    .filter(m => balance[m.id] > 0.01)
    .map(m => ({ ...m, amount: balance[m.id] }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount: Math.round(amount * 100) / 100,
    });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  res.json({
    balances: members.map(m => ({
      id: m.id,
      name: m.name,
      net: Math.round(balance[m.id] * 100) / 100,
    })),
    settlements,
  });
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));
