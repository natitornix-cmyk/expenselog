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
    <div className="p-4 space-y-5">
      <h2 className="font-black text-zinc-100 text-lg">จัดการสมาชิก</h2>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ชื่อสมาชิกใหม่"
          className="flex-1 bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-zinc-600"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors"
        >
          เพิ่ม
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <ul className="space-y-2">
        {members.map(m => (
          <li
            key={m.id}
            className="bg-zinc-900 rounded-2xl border border-white/8 px-4 py-3.5 flex items-center justify-between"
          >
            <span className="font-semibold text-zinc-200">{m.name}</span>
            <button
              onClick={() => handleDelete(m)}
              className="text-xs text-red-500/50 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
            >
              ลบ
            </button>
          </li>
        ))}
      </ul>

      {members.length === 0 && (
        <p className="text-zinc-700 text-sm text-center py-6">ยังไม่มีสมาชิก</p>
      )}
    </div>
  );
}
