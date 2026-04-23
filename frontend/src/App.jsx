import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { getMembers, getExpenses, getMyProfile, getExchangeRates } from './api';
import { calculateBalances } from './utils/balances';
import LoginPage from './components/LoginPage';
import MemberLinkPage from './components/MemberLinkPage';
import MembersSettings from './components/MembersSettings';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseList from './components/ExpenseList';
import BalanceSummary from './components/BalanceSummary';
import ProfileDrawer from './components/ProfileDrawer';

const TABS = [
  { id: 'members', label: 'สมาชิก', icon: '👥' },
  { id: 'add',     label: 'เพิ่ม',   icon: '➕' },
  { id: 'list',    label: 'รายการ',  icon: '📋' },
  { id: 'balances',label: 'สรุป',    icon: '💰' },
];

function Avatar({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xs font-black text-amber-300">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function App() {
  // undefined = still loading, null = no session/profile
  const [session, setSession] = useState(undefined);
  const [myProfile, setMyProfile] = useState(undefined);

  const [tab, setTab] = useState('add');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [rates, setRates] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
    try { setMembers(await getMembers()); } catch {}
  }, [session]);

  const refreshExpenses = useCallback(async () => {
    if (!session) return;
    try { setExpenses(await getExpenses()); } catch {}
  }, [session]);

  const refreshRates = useCallback(async () => {
    if (!session) return;
    try { setRates(await getExchangeRates()); } catch {}
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

  const avatarUrl = session.user.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col max-w-lg mx-auto">
      <header className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-4 py-3.5 border-b border-amber-400/20 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-zinc-100 tracking-tight">
            From Street to Strait
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">บันทึกค่าใช้จ่ายกลุ่ม</p>
        </div>

        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-white/8 hover:border-white/15 rounded-2xl px-3 py-2 transition-all"
        >
          <Avatar url={avatarUrl} name={myProfile.name} />
          <span className="text-sm font-semibold text-zinc-200 max-w-[80px] truncate">{myProfile.name}</span>
          <span className="text-zinc-600 text-xs">▾</span>
        </button>
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

      {profileOpen && (
        <ProfileDrawer
          session={session}
          myProfile={myProfile}
          onNicknameSaved={name => setMyProfile(prev => ({ ...prev, name }))}
          onSignOut={() => supabase.auth.signOut()}
          onDeleted={() => { setProfileOpen(false); setMyProfile(null); }}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
