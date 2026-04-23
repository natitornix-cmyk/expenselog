import { useState, useEffect } from 'react';
import { createExpense, updateExpense } from '../api';

const today = () => new Date().toISOString().split('T')[0];

export default function AddExpenseForm({ members, editingExpense, onSaved, onCancel, currentUserId, myName }) {
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [equalTotal, setEqualTotal] = useState('');
  const [equalSelected, setEqualSelected] = useState(new Set());
  const [customAmounts, setCustomAmounts] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (members.length > 0 && !editingExpense) {
      setEqualSelected(new Set(members.map(m => m.id)));
      if (!paidBy) setPaidBy(members[0].id);
    }
  }, [members]); // eslint-disable-line

  useEffect(() => {
    if (!editingExpense || members.length === 0) return;
    setDate(editingExpense.date);
    setDescription(editingExpense.description);
    setPaidBy(editingExpense.paid_by);
    setNotes(editingExpense.notes ?? '');
    setSplitType('custom');
    const amounts = {};
    for (const s of editingExpense.splits) amounts[s.member_id] = s.amount;
    setCustomAmounts(amounts);
  }, [editingExpense, members]);

  function toggleMember(id) {
    setEqualSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function buildSplits() {
    if (splitType === 'equal') {
      const total = parseFloat(equalTotal) || 0;
      const selected = members.filter(m => equalSelected.has(m.id));
      if (!selected.length || total <= 0) return [];
      const each = Math.round((total / selected.length) * 100) / 100;
      return selected.map(m => ({ member_id: m.id, amount: each, name: m.name }));
    }
    return members
      .filter(m => parseFloat(customAmounts[m.id] || 0) > 0)
      .map(m => ({ member_id: m.id, amount: parseFloat(customAmounts[m.id]), name: m.name }));
  }

  function validate() {
    if (!description.trim()) return 'ต้องใส่ชื่อรายการ';
    if (!paidBy) return 'ต้องเลือกคนที่จ่าย';
    const splits = buildSplits();
    if (!splits.length) return 'ต้องมีอย่างน้อย 1 คนที่มียอดเงิน';
    if (splits.reduce((s, x) => s + x.amount, 0) <= 0) return 'ยอดรวมต้องมากกว่า 0';
    return null;
  }

  function handleClickSave(e) {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setPreview(true);
  }

  function resetForm() {
    setDate(today());
    setDescription('');
    setEqualTotal('');
    setNotes('');
    setCustomAmounts({});
    setSplitType('equal');
    if (members.length > 0) {
      setEqualSelected(new Set(members.map(m => m.id)));
      setPaidBy(members[0].id);
    }
  }

  async function handleConfirm() {
    setSaving(true);
    setError('');
    const splits = buildSplits();
    try {
      const paidByName = members.find(m => m.id === paidBy)?.name;
      const payload = { date, description, paid_by: paidBy, splits, notes, paid_by_name: paidByName, my_name: myName };
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense({ ...payload, created_by: currentUserId });
      }
      setPreview(false);
      resetForm();
      onSaved();
    } catch (err) {
      setError(err.message);
      setPreview(false);
      setSaving(false);
    }
  }

  const splits = buildSplits();
  const displayTotal = splits.reduce((s, x) => s + x.amount, 0);
  const paidByMember = members.find(m => m.id === paidBy);
  const perPerson = equalSelected.size > 0 && parseFloat(equalTotal) > 0
    ? Math.round((parseFloat(equalTotal) / equalSelected.size) * 100) / 100
    : 0;

  return (
    <>
      <form onSubmit={handleClickSave} className="p-4 space-y-5">
        <h2 className="font-black text-zinc-100 text-lg">
          {editingExpense ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
        </h2>

        {/* Date */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">วันที่</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">รายการ</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="เช่น ตั๋วเครื่องบิน, อาหารเย็น"
            className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-zinc-600"
          />
        </div>

        {/* Who paid */}
        <div>
          <label className="text-xs text-zinc-500 block mb-2">คนจ่าย</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidBy(m.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  paidBy === m.id
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                    : 'bg-zinc-800 text-zinc-400 border-white/10 hover:border-white/20'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="text-xs text-zinc-500 block mb-2">แบ่งค่าใช้จ่าย</label>
          <div className="inline-flex rounded-xl overflow-hidden border border-white/10">
            {[['equal', 'หารเท่ากัน'], ['custom', 'กำหนดเอง']].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  splitType === type
                    ? 'bg-amber-400 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Equal split */}
        {splitType === 'equal' && (
          <div className="space-y-3 bg-zinc-900 rounded-2xl p-4 border border-white/5">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">ยอดรวม (บาท)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={equalTotal}
                onChange={e => setEqualTotal(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-2">หารกับใครบ้าง</p>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      equalSelected.has(m.id)
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        : 'bg-zinc-800 text-zinc-500 border-white/8'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              {perPerson > 0 && (
                <p className="text-xs text-amber-400/80 mt-2">
                  คนละ {perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom split */}
        {splitType === 'custom' && (
          <div className="space-y-2 bg-zinc-900 rounded-2xl p-4 border border-white/5">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm font-medium w-16 shrink-0 text-zinc-300">{m.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customAmounts[m.id] ?? ''}
                  onChange={e => setCustomAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <span className="text-zinc-600 text-sm shrink-0">บาท</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">หมายเหตุ (ไม่บังคับ)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-zinc-600"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-zinc-500 text-sm">
            รวม{' '}
            <span className="font-bold text-amber-400">
              {displayTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
            </span>
          </span>
          <div className="flex gap-2">
            {editingExpense && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm bg-zinc-800 text-zinc-400 border border-white/10"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-900 font-bold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              {editingExpense ? 'บันทึก' : 'ถัดไป →'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation overlay */}
      {preview && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl w-full max-w-sm p-6 space-y-5">
            <h3 className="font-black text-zinc-100 text-center text-lg">ยืนยันรายการ?</h3>

            <div className="text-center py-2">
              <p className="text-5xl font-black text-amber-400 tabular-nums">
                {displayTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-zinc-600 text-sm mt-1">บาท</p>
            </div>

            <div className="bg-zinc-800/60 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">รายการ</span>
                <span className="text-zinc-100 font-semibold text-right max-w-[60%] truncate">{description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">วันที่</span>
                <span className="text-zinc-300">{date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">คนจ่าย</span>
                <span className="text-amber-400 font-semibold">{paidByMember?.name}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-zinc-600 mb-2">แบ่งเป็น</p>
              {splits.map(s => (
                <div key={s.member_id} className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">{s.name}</span>
                  <span className="text-zinc-200 text-sm font-semibold tabular-nums">
                    {s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPreview(false)}
                className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-medium text-sm border border-white/10"
              >
                ← แก้ไข
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-amber-400/20"
              >
                {saving ? 'กำลังบันทึก...' : 'ยืนยัน ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
