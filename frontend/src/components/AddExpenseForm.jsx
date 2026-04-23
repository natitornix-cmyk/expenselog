import { useState, useEffect } from 'react';
import { createExpense, updateExpense } from '../api';

const today = () => new Date().toISOString().split('T')[0];

export default function AddExpenseForm({ members, editingExpense, onSaved, onCancel }) {
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

  // When members list loads (and no editing), select all by default
  useEffect(() => {
    if (members.length > 0 && !editingExpense) {
      setEqualSelected(new Set(members.map(m => m.id)));
      if (!paidBy) setPaidBy(members[0].id);
    }
  }, [members]); // eslint-disable-line

  // Populate form when editing
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
      return selected.map(m => ({ member_id: m.id, amount: each }));
    }
    return members
      .filter(m => parseFloat(customAmounts[m.id] || 0) > 0)
      .map(m => ({ member_id: m.id, amount: parseFloat(customAmounts[m.id]) }));
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const splits = buildSplits();
    if (!splits.length) return setError('ต้องมีอย่างน้อย 1 คนที่มียอดเงิน');
    setSaving(true);
    try {
      const payload = { date, description, paid_by: paidBy, splits, notes };
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload);
      }
      resetForm();
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const displayTotal = splitType === 'equal'
    ? parseFloat(equalTotal) || 0
    : members.reduce((s, m) => s + parseFloat(customAmounts[m.id] || 0), 0);

  const perPerson = equalSelected.size > 0 && parseFloat(equalTotal) > 0
    ? Math.round((parseFloat(equalTotal) / equalSelected.size) * 100) / 100
    : 0;

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h2 className="font-semibold text-slate-700">
        {editingExpense ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
      </h2>

      {/* Date */}
      <div>
        <label className="text-xs text-slate-500 block mb-1">วันที่</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-slate-500 block mb-1">รายการ</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="เช่น ตั๋วเครื่องบิน, อาหารเย็น"
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Who paid */}
      <div>
        <label className="text-xs text-slate-500 block mb-2">คนจ่าย</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidBy(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                paidBy === m.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Split type */}
      <div>
        <label className="text-xs text-slate-500 block mb-2">แบ่งค่าใช้จ่าย</label>
        <div className="inline-flex rounded-lg overflow-hidden border border-slate-300">
          {[['equal', 'หารเท่ากัน'], ['custom', 'กำหนดเอง']].map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                splitType === type ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Equal split */}
      {splitType === 'equal' && (
        <div className="space-y-3 bg-slate-100 rounded-xl p-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">ยอดรวม (บาท)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={equalTotal}
              onChange={e => setEqualTotal(e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">หารกับใครบ้าง</p>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    equalSelected.has(m.id)
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {perPerson > 0 && (
              <p className="text-xs text-indigo-600 mt-2 font-medium">
                คนละ {perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </p>
            )}
          </div>
        </div>
      )}

      {/* Custom split */}
      {splitType === 'custom' && (
        <div className="space-y-2 bg-slate-100 rounded-xl p-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="text-sm font-medium w-16 shrink-0 text-slate-700">{m.name}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={customAmounts[m.id] ?? ''}
                onChange={e => setCustomAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                placeholder="0.00"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <span className="text-slate-400 text-sm shrink-0">บาท</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs text-slate-500 block mb-1">หมายเหตุ (ไม่บังคับ)</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <span className="text-slate-500 text-sm">
          รวม{' '}
          <span className="font-bold text-slate-800">
            {displayTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
          </span>
        </span>
        <div className="flex gap-2">
          {editingExpense && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm border border-slate-300 text-slate-600"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : editingExpense ? 'อัปเดต' : 'บันทึก'}
          </button>
        </div>
      </div>
    </form>
  );
}
