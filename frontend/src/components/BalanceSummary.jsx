import { useState } from 'react';
import { upsertExchangeRate } from '../api';
import { convertAmount, formatTHB, formatMYR, formatSGD } from '../utils/currency';

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

  const { balances, settlements, hasUnconverted } = data;
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
      <h2 className="font-black text-zinc-100 text-lg">ยอดสุทธิของแต่ละคน</h2>

      {hasUnconverted && (
        <div className="bg-amber-950/40 border border-amber-500/20 rounded-xl px-3 py-2.5">
          <p className="text-xs text-amber-400">
            ⚠️ มีรายการ RM / S$ ที่ยังไม่มีอัตราแลกเปลี่ยน — ยอดด้านล่างอาจไม่ถูกต้อง
            กรุณาตั้งอัตราแลกเปลี่ยนด้านล่างก่อน
          </p>
        </div>
      )}

      {/* Balance list */}
      <div className="space-y-2">
        {balances.map(b => {
          const isCreditor = b.net > 0.01;
          const isDebtor = b.net < -0.01;
          const { myr, sgd } = convertAmount(Math.abs(b.net), rates);
          return (
            <div
              key={b.id}
              className="bg-zinc-900 rounded-2xl border border-white/8 px-4 py-3.5 flex items-center gap-3"
            >
              {/* Dot */}
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isCreditor ? 'bg-emerald-400' : isDebtor ? 'bg-red-400' : 'bg-zinc-600'
              }`} />

              {/* Name + badge */}
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-zinc-200 text-sm">{b.name}</span>
                <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  isCreditor
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20'
                    : isDebtor
                    ? 'bg-red-950 text-red-400 border border-red-500/20'
                    : 'bg-zinc-800 text-zinc-600 border border-white/8'
                }`}>
                  {isCreditor ? 'เจ้าหนี้' : isDebtor ? 'ลูกหนี้' : 'เท่ากัน'}
                </span>
              </div>

              {/* Amount */}
              <div className="shrink-0 text-right">
                <p className={`font-black tabular-nums text-lg ${
                  isCreditor ? 'text-emerald-400' : isDebtor ? 'text-red-400' : 'text-zinc-600'
                }`}>
                  {b.net >= 0 ? '+' : ''}{formatTHB(b.net)}
                </p>
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

      {settlements.length > 0 && (
        <>
          <h2 className="font-black text-zinc-100 text-lg pt-1">การชำระหนี้</h2>
          <div className="space-y-2">
            {settlements.map((s, i) => {
              const { myr, sgd } = convertAmount(s.amount, rates);
              return (
                <div
                  key={i}
                  className="bg-zinc-900 rounded-2xl border border-white/8 px-4 py-4 flex items-center gap-3"
                >
                  {/* Debtor */}
                  <div className="min-w-0">
                    <p className="font-bold text-red-400 truncate">{s.from}</p>
                    <p className="text-xs text-red-600 mt-0.5">ลูกหนี้</p>
                  </div>

                  <span className="text-amber-400 text-base flex-1 text-center">→</span>

                  {/* Creditor */}
                  <div className="min-w-0 text-right">
                    <p className="font-bold text-emerald-400 truncate">{s.to}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">เจ้าหนี้</p>
                  </div>

                  {/* Amount */}
                  <div className="ml-2 shrink-0 text-right">
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

      {/* Exchange rate — compact toggle */}
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
              className="text-zinc-600 hover:text-amber-400 transition-colors p-1"
              title="แก้ไขอัตราแลกเปลี่ยน"
            >
              ⚙️
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-semibold">อัตราแลกเปลี่ยน (฿1 =)</p>
              <button
                onClick={() => setEditingRates(false)}
                className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
              >
                ✕
              </button>
            </div>
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
