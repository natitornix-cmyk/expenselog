import { useState } from 'react';
import { createMyProfile } from '../api';

export default function MemberLinkPage({ session, onLinked }) {
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createMyProfile(nickname.trim());
      onLinked();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">👤</div>
          <h2 className="text-2xl font-black text-zinc-100">ตั้งชื่อเล่น</h2>
          <p className="text-zinc-600 text-sm mt-1.5">{session.user.email}</p>
          <p className="text-zinc-500 text-xs mt-2">ชื่อที่จะแสดงให้เพื่อนในกลุ่มเห็น</p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="เช่น บูม, หนึ่ง, โอม..."
            autoFocus
            className="w-full bg-zinc-800 border border-white/10 text-zinc-100 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-zinc-600 text-center"
          />

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-950/40 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!nickname.trim() || saving}
            className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold py-4 rounded-2xl transition-colors disabled:opacity-40 text-base shadow-lg shadow-amber-400/20"
          >
            {saving ? 'กำลังบันทึก...' : 'เริ่มใช้งาน →'}
          </button>
        </form>
      </div>
    </div>
  );
}
