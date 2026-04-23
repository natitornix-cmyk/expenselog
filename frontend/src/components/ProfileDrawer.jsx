import { useState } from 'react';
import { updateMyNickname, deleteMyAccount } from '../api';

function Avatar({ url, name, size = 'md' }) {
  const dim = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-8 h-8 text-sm';
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover ring-2 ring-white/10`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-black text-amber-300`}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function ProfileDrawer({ session, myProfile, onNicknameSaved, onSignOut, onDeleted, onClose }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const avatarUrl = session.user.user_metadata?.avatar_url;
  const email = session.user.email;

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    setNameError('');
    try {
      await updateMyNickname(nameInput.trim());
      onNicknameSaved(nameInput.trim());
      setEditingName(false);
    } catch (err) {
      setNameError(err.message);
    } finally {
      setNameSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteMyAccount(myProfile.id);
      onDeleted();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative bg-zinc-900 rounded-t-3xl border-t border-white/10 shadow-2xl w-full max-w-lg mx-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pb-8 pt-4 space-y-6">
          {/* Profile identity */}
          <div className="flex items-center gap-4">
            <Avatar url={avatarUrl} name={myProfile.name} size="lg" />
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="space-y-1.5">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                    autoFocus
                    className="w-full bg-zinc-800 border border-amber-400/40 text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                  {nameError && <p className="text-xs text-red-400">{nameError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveName}
                      disabled={nameSaving || !nameInput.trim()}
                      className="text-xs bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                    >
                      {nameSaving ? '...' : 'บันทึก'}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameError(''); }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-zinc-100 text-lg leading-tight truncate">{myProfile.name}</span>
                    <button
                      onClick={() => { setNameInput(myProfile.name); setEditingName(true); setDeleteError(''); setConfirmDelete(false); }}
                      className="text-zinc-600 hover:text-amber-400 transition-colors shrink-0"
                      title="แก้ไขชื่อเล่น"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 border-t border-white/8 pt-5">
            <button
              onClick={onSignOut}
              className="w-full text-left px-4 py-3.5 rounded-2xl bg-zinc-800 border border-white/8 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-3"
            >
              <span className="text-base">🚪</span>
              ออกจากระบบ
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => { setConfirmDelete(true); setDeleteError(''); }}
                className="w-full text-left px-4 py-3.5 rounded-2xl border border-red-500/20 text-red-400/70 text-sm font-medium hover:bg-red-950/30 hover:text-red-400 hover:border-red-500/40 transition-colors flex items-center gap-3"
              >
                <span className="text-base">🗑️</span>
                ลบบัญชีนี้
              </button>
            ) : (
              <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-300">ยืนยันการลบบัญชี?</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  ชื่อของคุณจะถูกลบออกจากกลุ่ม คุณสามารถสร้างชื่อใหม่ได้เมื่อ login ครั้งต่อไป
                </p>
                {deleteError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 rounded-xl px-3 py-2">
                    {deleteError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm border border-white/10 hover:bg-zinc-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'กำลังลบ...' : 'ยืนยัน ลบ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
