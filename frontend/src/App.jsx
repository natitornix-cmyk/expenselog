import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { getMembers, getExpenses, getMyProfile, updateMyNickname, getExchangeRates } from './api';
import { calculateBalances } from './utils/balances';
import LoginPage from './components/LoginPage';
import MemberLinkPage from './components/MemberLinkPage';
import MembersSettings from './components/MembersSettings';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseList from './components/ExpenseList';
import BalanceSummary from './components/BalanceSummary';

const TABS = [
  { id: 'members', label: 'สมาชิก', icon: '👥' },
  { id: 'add',     label: 'เพิ่ม',   icon: '➕' },
  { id: 'list',    label: 'รายการ',  icon: '📋' },
  { id: 'balances',label: 'สรุป',    icon: '💰' },
];

export default function App() {
  // undefined = still loading, null = no session/profile
  const [session, setSession] = useState(undefined);
  const [myProfile, setMyProfile] = useState(undefined);

  const [tab, setTab] = useState('add');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [rates, setRates] = useState(null);

  // Inline nickname edit state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load profile whenever session changes
  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setMyProfile(null); return; }
    getMyProfile()
      .then(profile => setMyProfile(profile ?? null))
      .catch(() => setMyProfile(null));
  }, [session]);

  const isReady = !!(session && myProfile);

  const refreshMembers = useCallback(async () => {
    if (!session) return;
    setMembers(await getMembers());
  }, [session]);

  const refreshExpenses = useCallback(async () => {
    if (!session) return;
    setExpenses(await getExpenses());
  }, [session]);

  const refreshRates = useCallback(async () => {
    if (!session) return;
    setRates(await getExchangeRates());
  }, [session]);

  useEffect(() => {
    if (isReady) {
      refreshMembers();
      refreshExpenses();
      refreshRates();
    }
  }, [isReady, refreshMembers, refreshExpenses, refreshRates]);

  const balances = useMemo(
    () => (members.length > 0 ? calculateBalances(members, expenses, rates) : null),
    [members, expenses, rates]
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    try {
      await updateMyNickname(nameInput.trim());
      setMyProfile(prev => ({ ...prev, name: nameInput.trim() }));
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  }

  function handleEditExpense(expense) {
    setEditingExpense(expense);
    setTab('add');
  }

  function handleTabChange(id) {
    setTab(id);
    if (id !== 'add') setEditingExpense(null);
  }

  // Loading
  if (session === undefined || (session && myProfile === undefined)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  if (!myProfile) {
    return (
      <MemberLinkPage
        session={session}
        onLinked={() => getMyProfile().then(p => setMyProfile(p ?? null))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col max-w-lg mx-auto">
      <header className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-4 py-3.5 border-b border-amber-400/20 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-zinc-100 tracking-tight">
            From Street to Strait
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">บันทึกค่าใช้จ่ายกลุ่ม</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="bg-zinc-800 border border-amber-400/40 text-zinc-100 rounded-lg px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !nameInput.trim()}
                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40"
              >
                {nameSaving ? '...' : 'บันทึก'}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(myProfile.name); setEditingName(true); }}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              <span className="font-semibold">{myProfile.name}</span>
              <span className="text-zinc-700 group-hover:text-zinc-500 text-[10px]">✏️</span>
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'members' && (
          <MembersSettings members={members} onChanged={refreshMembers} />
        )}
        {tab === 'add' && (
          <AddExpenseForm
            members={members}
            editingExpense={editingExpense}
            currentUserId={session.user.id}
            myName={myProfile.name}
            onSaved={() => {
              setEditingExpense(null);
              refreshExpenses();
              setTab('list');
            }}
            onCancel={() => setEditingExpense(null)}
          />
        )}
        {tab === 'list' && (
          <ExpenseList
            expenses={expenses}
            currentUserId={session.user.id}
            currentMemberId={myProfile.id}
            onDeleted={refreshExpenses}
            onEdit={handleEditExpense}
            onFlagged={refreshExpenses}
          />
        )}
        {tab === 'balances' && (
          <BalanceSummary data={balances} rates={rates} onRatesChanged={refreshRates} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-zinc-900 border-t border-white/8 flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-0.5 transition-colors relative ${
              tab === t.id ? 'text-amber-400' : 'text-zinc-600'
            }`}
          >
            {tab === t.id && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-amber-400 rounded-full" />
            )}
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
