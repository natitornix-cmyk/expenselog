import { useState, useEffect } from 'react';
import { getMembers, createMyProfile, claimMember } from '../api';

function Avatar({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-sm font-black text-amber-300">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function MemberLinkPage({ session, onLinked }) {
  const [unlinked, setUnlinked] = useState([]);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMembers()
      .then(all => setUnlinked(all.filter(m => !m.user_id)))
      .catch(() => {});
  }, []);

  async function handleClaim(member) {
    setClaiming(member.id);
    setError('');
    try {
      await claimMember(member.id);
      onLinked();
    } catch (err) {
      setError(err.message);
      setClaiming(null);
    }
  }

  async function handleCreate(e) {
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
          <p className="text-zinc-500 text-xs mt-1">ชื่อที่จะแสดงให้เพื่อนในกลุ่มเห็น</p>
        </div>

        {/* Claim existing member */}
        {unlinked.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 font-semibold text-center">ฉันคือ...</p>
            <div className="grid grid-cols-2 gap-2">
              {unlinked.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleClaim(m)}
                  disabled={claiming !== null}
                  className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-amber-400/30 rounded-2xl px-4 py-3 transition-all disabled:opacity-50 text-left"
                >
                  <Avatar url={m.avatar_url} name={m.name} />
                  <span className="font-semibold text-zinc-200 text-sm truncate">
                    {claiming === m.id ? '...' : m.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-zinc-700">หรือ</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
          </div>
        )}

        {/* Create new */}
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="ใช้ชื่อใหม่..."
            autoFocus={unlinked.length === 0}
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
