import { useState } from 'react';
import { supabase } from '../supabase';
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

  const [confirmEmail, setConfirmEmail] = useState(false);

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
      await supabase.auth.signOut();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  async function handleChangeEmail() {
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  function resetActions() {
    setConfirmDelete(false);
    setConfirmEmail(false);
    setDeleteError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative bg-zinc-900 rounded-t-3xl border-t border-white/10 shadow-2xl w-full max-w-lg mx-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pb-10 pt-4 space-y-6">

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
                      onClick={() => { setNameInput(myProfile.name); setEditingName(true); resetActions(); }}
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

            {/* Sign out */}
            <button
              onClick={onSignOut}
              className="w-full text-left px-4 py-3.5 rounded-2xl bg-zinc-800 border border-white/8 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-3"
            >
              <span className="text-base">🚪</span>
              ออกจากระบบ
            </button>

            {/* Change Google account (email) */}
            {!confirmEmail ? (
              <button
                onClick={() => { setConfirmEmail(true); resetActions(); setConfirmEmail(true); }}
                className="w-full text-left px-4 py-3.5 rounded-2xl bg-zinc-800 border border-white/8 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-3"
              >
                <span className="text-base">📧</span>
                เปลี่ยนอีเมล (บัญชี Google)
              </button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-zinc-800/60 p-4 space-y-3">
                <p className="text-sm font-semibold text-zinc-200">เปลี่ยนบัญชี Google?</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  อีเมลผูกติดกับบัญชี Google ที่ใช้ login อยู่ เมื่อออกจากระบบจะสามารถ login ด้วย Google account อื่นได้
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmEmail(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-700 text-zinc-400 text-sm border border-white/10 hover:bg-zinc-600 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleChangeEmail}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    ออกและเปลี่ยน Google
                  </button>
                </div>
              </div>
            )}

            {/* Delete account */}
            {!confirmDelete ? (
              <button
                onClick={() => { setConfirmDelete(true); resetActions(); setConfirmDelete(true); }}
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
