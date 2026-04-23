export function calculateBalances(members, expenses) {
  const balance = {};
  for (const m of members) balance[m.id] = 0;

  for (const expense of expenses) {
    for (const split of expense.splits) {
      balance[expense.paid_by] += split.amount;
      balance[split.member_id] -= split.amount;
    }
  }

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

  return {
    balances: members.map(m => ({
      id: m.id,
      name: m.name,
      net: Math.round(balance[m.id] * 100) / 100,
    })),
    settlements,
  };
}
