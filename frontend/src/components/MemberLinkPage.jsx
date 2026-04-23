import { useState, useEffect } from 'react';
import { getMembers, getClaimedMemberIds, linkUserToMember } from '../api';

export default function MemberLinkPage({ session, onLinked }) {
  const [members, setMembers] = useState([]);
  const [claimedIds, setClaimedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMembers(), getClaimedMemberIds()]).then(([mems, claimed]) => {
      setMembers(mems);
      setClaimedIds(claimed);
    });
  }, []);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await linkUserToMember(session.user.id, selected);
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
          <h2 className="text-2xl font-black text-zinc-100">คุณคือใคร?</h2>
          <p className="text-zinc-600 text-sm mt-1.5">{session.user.email}</p>
        </div>

        <div className="space-y-2">
          {members.map(m => {
            const claimed = claimedIds.includes(m.id);
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                disabled={claimed}
                onClick={() => setSelected(m.id)}
                className={`w-full px-4 py-4 rounded-2xl border text-left transition-all ${
                  claimed
                    ? 'bg-zinc-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                    : isSelected
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 shadow-lg shadow-amber-400/10'
                    : 'bg-zinc-900 border-white/8 text-zinc-200 hover:border-white/20 active:border-amber-400/30'
                }`}
              >
                <span className="font-bold text-base">{m.name}</span>
                {claimed && (
                  <span className="text-xs ml-2 text-zinc-700">(ถูกใช้แล้ว)</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-950/40 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold py-4 rounded-2xl transition-colors disabled:opacity-40 text-base shadow-lg shadow-amber-400/20"
        >
          {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
        </button>
      </div>
    </div>
  );
}
