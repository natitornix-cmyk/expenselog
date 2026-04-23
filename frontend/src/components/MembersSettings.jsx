import { useState } from 'react';
import { addMember, deleteMember } from '../api';

export default function MembersSettings({ members, onChanged }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await addMember(name.trim());
      setName('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(member) {
    try {
      await deleteMember(member.id);
      onChanged();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold text-slate-700">จัดการสมาชิก</h2>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ชื่อสมาชิกใหม่"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          เพิ่ม
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <ul className="space-y-2">
        {members.map(m => (
          <li key={m.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="font-medium text-slate-800">{m.name}</span>
            <button
              onClick={() => handleDelete(m)}
              className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
            >
              ลบ
            </button>
          </li>
        ))}
      </ul>

      {members.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-4">ยังไม่มีสมาชิก</p>
      )}
    </div>
  );
}
