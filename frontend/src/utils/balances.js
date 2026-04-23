function toTHB(amount, currency, rates) {
  if (currency === 'MYR' && rates?.MYR) return amount / rates.MYR;
  if (currency === 'SGD' && rates?.SGD) return amount / rates.SGD;
  return amount; // THB or unknown: use as-is
}

export function calculateBalances(members, expenses, rates = {}) {
  const balance = {};
  for (const m of members) balance[m.id] = 0;

  let hasUnconverted = false;

  for (const expense of expenses) {
    const currency = expense.currency ?? 'THB';
    if ((currency === 'MYR' && !rates?.MYR) || (currency === 'SGD' && !rates?.SGD)) {
      hasUnconverted = true;
    }
    for (const split of expense.splits) {
      const thb = toTHB(split.amount, currency, rates);
      balance[expense.paid_by] += thb;
      balance[split.member_id] -= thb;
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
    hasUnconverted,
  };
}
