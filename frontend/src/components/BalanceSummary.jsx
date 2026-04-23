import { useState } from 'react';
import { upsertExchangeRate } from '../api';
import { convertAmount, formatTHB, formatMYR, formatSGD } from '../utils/currency';

function CurrencyRow({ thb, rates }) {
  const { myr, sgd } = convertAmount(thb, rates);
  if (!myr && !sgd) return null;
  return (
    <div className="flex gap-3 mt-1">
      {myr != null && <span className="text-xs text-zinc-500 tabular-nums">{formatMYR(myr)}</span>}
      {sgd != null && <span className="text-xs text-zinc-500 tabular-nums">{formatSGD(sgd)}</span>}
    </div>
  );
}

export default function BalanceSummary({ data, rates, onRatesChanged }) {
  const [editingRates, setEditingRates] = useState(false);
  const [myrInput, setMyrInput] = useState('');
  const [sgdInput, setSgdInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-600 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  const { balances, settlements } = data;
  const allSettled = balances.every(b => Math.abs(b.net) < 0.01);

  async function handleSaveRates() {
    setSaving(true);
    try {
      const promises = [];
      const myr = parseFloat(myrInput);
      const sgd = parseFloat(sgdInput);
      if (!isNaN(myr) && myr > 0) promises.push(upsertExchangeRate('MYR', myr));
      if (!isNaN(sgd) && sgd > 0) promises.push(upsertExchangeRate('SGD', sgd));
      await Promise.all(promises);
      await onRatesChanged();
      setEditingRates(false);
    } finally {
      setSaving(false);
    }
  }

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
              {formatTHB(b.net)}
            </p>
            <CurrencyRow thb={Math.abs(b.net)} rates={rates} />
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
            {settlements.map((s, i) => {
              const { myr, sgd } = convertAmount(s.amount, rates);
              return (
                <div
                  key={i}
                  className="bg-zinc-900 rounded-2xl border border-white/8 px-4 py-4 flex items-center gap-3"
                >
                  <span className="font-bold text-red-400 shrink-0">{s.from}</span>
                  <span className="text-amber-400 text-base flex-1 text-center">→</span>
                  <span className="font-bold text-emerald-400 shrink-0">{s.to}</span>
                  <div className="ml-auto shrink-0 text-right">
                    <div className="font-black text-zinc-100 text-xl tabular-nums">
                      {formatTHB(s.amount)}
                      <span className="text-zinc-600 text-xs ml-1">฿</span>
                    </div>
                    {(myr != null || sgd != null) && (
                      <div className="flex gap-2 justify-end mt-0.5">
                        {myr != null && <span className="text-xs text-zinc-500 tabular-nums">{formatMYR(myr)}</span>}
                        {sgd != null && <span className="text-xs text-zinc-500 tabular-nums">{formatSGD(sgd)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {allSettled && (
        <div className="text-center py-12">
          <div className="text-6xl mb-3">🎉</div>
          <p className="font-black text-emerald-400 text-xl">ชำระหนี้ครบแล้ว!</p>
        </div>
      )}

      {/* Exchange rate editor */}
      <div className="border-t border-white/8 pt-4">
        {!editingRates ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {rates?.MYR ? `฿1 = RM ${rates.MYR}` : 'MYR ยังไม่ได้ตั้ง'}
              {rates?.MYR && rates?.SGD ? ' · ' : ''}
              {rates?.SGD ? `S$${rates.SGD}` : ''}
            </p>
            <button
              onClick={() => {
                setMyrInput(rates?.MYR?.toString() ?? '');
                setSgdInput(rates?.SGD?.toString() ?? '');
                setEditingRates(true);
              }}
              className="text-xs text-zinc-600 hover:text-amber-400 transition-colors"
            >
              แก้ไขอัตราแลกเปลี่ยน
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 font-semibold">อัตราแลกเปลี่ยน (฿1 =)</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-600 block mb-1">RM (MYR)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={myrInput}
                  onChange={e => setMyrInput(e.target.value)}
                  placeholder="0.1300"
                  className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-600 block mb-1">S$ (SGD)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={sgdInput}
                  onChange={e => setSgdInput(e.target.value)}
                  placeholder="0.0400"
                  className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingRates(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm border border-white/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveRates}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-sm transition-colors disabled:opacity-40"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
