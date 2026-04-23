import { useState } from 'react';
import { deleteExpense, flagExpense, resolveFlag } from '../api';

export default function ExpenseList({ expenses, currentUserId, currentMemberId, onDeleted, onEdit, onFlagged }) {
  const [flagging, setFlagging] = useState(null);
  const [flagNote, setFlagNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete(expense) {
    if (!confirm(`ลบ "${expense.description}"?`)) return;
    await deleteExpense(expense.id);
    onDeleted();
  }

  async function handleFlag() {
    if (!flagging || !flagNote.trim()) return;
    setSubmitting(true);
    try {
      await flagExpense(flagging.id, flagNote.trim(), currentMemberId);
      setFlagging(null);
      setFlagNote('');
      onFlagged();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(flagId) {
    await resolveFlag(flagId);
    onFlagged();
  }

  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-3">📝</div>
        <p className="text-zinc-600">ยังไม่มีรายการค่าใช้จ่าย</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        <p className="text-xs text-zinc-700">{expenses.length} รายการ</p>

        {expenses.map(expense => {
          const isOwner = expense.created_by === currentUserId;
          const hasFlags = expense.activeFlags?.length > 0;

          return (
            <div
              key={expense.id}
              className={`rounded-2xl border shadow-xl overflow-hidden ${
                hasFlags
                  ? 'bg-zinc-900 border-amber-500/30'
                  : 'bg-zinc-900 border-white/8'
              }`}
            >
              {/* Flag banner */}
              {hasFlags && (
                <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                  {expense.activeFlags.map(f => (
                    <div key={f.id} className="flex items-start justify-between gap-2">
                      <p className="text-xs text-amber-300 leading-relaxed">
                        ⚠️ <span className="font-semibold">{f.flaggedBy ?? 'เพื่อน'}</span>
                        {' '}ทักท้วง: {f.note}
                      </p>
                      {isOwner && (
                        <button
                          onClick={() => handleResolve(f.id)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0 transition-colors ml-2"
                        >
                          รับทราบ ✓
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-100 leading-snug">{expense.description}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{expense.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-amber-400 text-xl tabular-nums">
                      {expense.total?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-xs bg-amber-400/10 text-amber-400/80 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-amber-400/20">
                      {expense.paid_by_name} จ่าย
                    </span>
                  </div>
                </div>

                {expense.splits?.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {expense.splits.map(s => (
                      <span
                        key={s.member_id}
                        className="text-xs bg-white/5 text-zinc-500 px-2 py-0.5 rounded-full border border-white/8"
                      >
                        {s.name}: {s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    ))}
                  </div>
                )}

                {expense.notes && (
                  <p className="text-xs text-zinc-600 mt-2">📝 {expense.notes}</p>
                )}

                <div className="flex gap-1 mt-3 justify-end border-t border-white/5 pt-2.5">
                  {!isOwner && (
                    <button
                      onClick={() => { setFlagging(expense); setFlagNote(''); }}
                      className="text-xs text-zinc-600 hover:text-amber-400 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      ⚠️ ทักท้วง
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <button
                        onClick={() => onEdit(expense)}
                        className="text-xs text-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        className="text-xs text-red-500/60 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
                      >
                        ลบ
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flag dialog */}
      {flagging && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="font-black text-zinc-100 text-lg">ทักท้วงรายการ</h3>
              <p className="text-zinc-500 text-sm mt-1">"{flagging.description}"</p>
            </div>

            <textarea
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              placeholder="อธิบายว่ารายการนี้น่าจะผิดตรงไหน..."
              rows={3}
              className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-zinc-600 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setFlagging(null)}
                className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-400 text-sm border border-white/10"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleFlag}
                disabled={!flagNote.trim() || submitting}
                className="flex-1 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-sm disabled:opacity-40 transition-colors"
              >
                {submitting ? 'กำลังส่ง...' : 'ส่ง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
