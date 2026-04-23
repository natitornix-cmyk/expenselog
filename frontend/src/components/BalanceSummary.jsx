export default function BalanceSummary({ data }) {
  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-600 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  const { balances, settlements } = data;
  const allSettled = balances.every(b => Math.abs(b.net) < 0.01);

  return (
    <div className="p-4 space-y-5">
      <h2 className="font-black text-zinc-100 text-lg">ยอดสุทธิ</h2>

      <div className="grid grid-cols-2 gap-3">
        {balances.map(b => (
          <div
            key={b.id}
            className={`rounded-2xl p-4 border ${
              b.net > 0.01
                ? 'bg-gradient-to-br from-emerald-950 to-zinc-900 border-emerald-500/20'
                : b.net < -0.01
                ? 'bg-gradient-to-br from-red-950 to-zinc-900 border-red-500/20'
                : 'bg-zinc-900 border-white/8'
            }`}
          >
            <p className="font-semibold text-zinc-400 text-sm">{b.name}</p>
            <p className={`text-2xl font-black mt-1 tabular-nums ${
              b.net > 0.01 ? 'text-emerald-400' : b.net < -0.01 ? 'text-red-400' : 'text-zinc-600'
            }`}>
              {b.net >= 0 ? '+' : ''}
              {b.net.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-xs mt-1 ${
              b.net > 0.01 ? 'text-emerald-600' : b.net < -0.01 ? 'text-red-600' : 'text-zinc-700'
            }`}>
              {b.net > 0.01 ? 'คนอื่นติดหนี้' : b.net < -0.01 ? 'ต้องโอนคืน' : 'เท่ากัน ✓'}
            </p>
          </div>
        ))}
      </div>

      {settlements.length > 0 && (
        <>
          <h2 className="font-black text-zinc-100 text-lg pt-1">ต้องโอนเงิน</h2>
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <div
                key={i}
                className="bg-zinc-900 rounded-2xl border border-white/8 px-4 py-4 flex items-center gap-3"
              >
                <span className="font-bold text-red-400 shrink-0">{s.from}</span>
                <span className="text-amber-400 text-base flex-1 text-center">→</span>
                <span className="font-bold text-emerald-400 shrink-0">{s.to}</span>
                <div className="ml-auto shrink-0 text-right">
                  <span className="font-black text-zinc-100 text-xl tabular-nums">
                    {s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-zinc-600 text-xs ml-1">บาท</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {allSettled && (
        <div className="text-center py-12">
          <div className="text-6xl mb-3">🎉</div>
          <p className="font-black text-emerald-400 text-xl">ชำระหนี้ครบแล้ว!</p>
        </div>
      )}
    </div>
  );
}
