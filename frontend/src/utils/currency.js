export function convertAmount(thb, rates) {
  return {
    thb,
    myr: rates?.MYR != null ? Math.round(thb * rates.MYR * 100) / 100 : null,
    sgd: rates?.SGD != null ? Math.round(thb * rates.SGD * 100) / 100 : null,
  };
}

export function formatTHB(n) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

export function formatMYR(n) {
  if (n == null) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
}

export function formatSGD(n) {
  if (n == null) return '—';
  return `S$${n.toLocaleString('en-SG', { minimumFractionDigits: 2 })}`;
}
