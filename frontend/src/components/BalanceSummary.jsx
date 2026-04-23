export default function BalanceSummary({ data }) {
  if (!data) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="text-4xl mb-2">⏳</div>
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  const { balances, settlements } = data;
  const allSettled = balances.every(b => Math.abs(b.net) < 0.01);

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold text-slate-700">ยอดสุทธิแต่ละคน</h2>

      <div className="grid grid-cols-2 gap-3">
        {balances.map(b => (
          <div key={b.id} className="bg-white rounded-xl shadow-sm p-3">
            <p className="font-medium text-slate-700">{b.name}</p>
            <p className={`text-xl font-bold mt-1 ${b.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {b.net >= 0 ? '+' : ''}
              {b.net.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {b.net > 0.01
                ? 'คนอื่นติดหนี้อยู่'
                : b.net < -0.01
                ? 'ต้องโอนคืน'
                : 'ยอดเท่ากัน ✓'}
            </p>
          </div>
        ))}
      </div>

      {settlements.length > 0 && (
        <>
          <h2 className="font-semibold text-slate-700 pt-2">ต้องโอนเงิน</h2>
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-2">
                <span className="font-semibold text-red-500 shrink-0">{s.from}</span>
                <span className="text-slate-400 text-xs">→ โอนให้ →</span>
                <span className="font-semibold text-green-600 shrink-0">{s.to}</span>
                <span className="font-bold text-slate-800 ml-auto shrink-0">
                  {s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {allSettled && (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-semibold text-green-600">ชำระหนี้ครบแล้ว!</p>
        </div>
      )}
    </div>
  );
}
