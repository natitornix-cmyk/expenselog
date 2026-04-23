import { deleteExpense } from '../api';

export default function ExpenseList({ expenses, onDeleted, onEdit }) {
  async function handleDelete(expense) {
    if (!confirm(`ลบ "${expense.description}"?`)) return;
    await deleteExpense(expense.id);
    onDeleted();
  }

  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="text-5xl mb-3">📝</div>
        <p>ยังไม่มีรายการค่าใช้จ่าย</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-slate-400">{expenses.length} รายการ</p>
      {expenses.map(expense => (
        <div key={expense.id} className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 leading-snug">{expense.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">{expense.date}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-indigo-600">
                {expense.total?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </p>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full inline-block mt-0.5">
                {expense.paid_by_name} จ่าย
              </span>
            </div>
          </div>

          {expense.splits?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expense.splits.map(s => (
                <span
                  key={s.member_id}
                  className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                >
                  {s.name}: {s.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              ))}
            </div>
          )}

          {expense.notes && (
            <p className="text-xs text-slate-400 mt-2">📝 {expense.notes}</p>
          )}

          <div className="flex gap-2 mt-3 justify-end border-t border-slate-50 pt-2">
            <button
              onClick={() => onEdit(expense)}
              className="text-xs text-indigo-500 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              แก้ไข
            </button>
            <button
              onClick={() => handleDelete(expense)}
              className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              ลบ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
