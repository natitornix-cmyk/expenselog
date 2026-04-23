import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { getMembers, getExpenses, getMyLink } from './api';
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
  // undefined = still loading, null = no session/link
  const [session, setSession] = useState(undefined);
  const [myLink, setMyLink] = useState(undefined);

  const [tab, setTab] = useState('add');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);

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

  // Check member link whenever session changes
  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setMyLink(null); return; }
    getMyLink().then(link => setMyLink(link ?? null));
  }, [session]);

  const isReady = !!(session && myLink);

  const refreshMembers = useCallback(async () => {
    if (!session) return;
    setMembers(await getMembers());
  }, [session]);

  const refreshExpenses = useCallback(async () => {
    if (!session) return;
    setExpenses(await getExpenses());
  }, [session]);

  useEffect(() => {
    if (isReady) {
      refreshMembers();
      refreshExpenses();
    }
  }, [isReady, refreshMembers, refreshExpenses]);

  const balances = useMemo(
    () => (members.length > 0 ? calculateBalances(members, expenses) : null),
    [members, expenses]
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
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
  if (session === undefined || (session && myLink === undefined)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  if (!myLink) {
    return (
      <MemberLinkPage
        session={session}
        onLinked={() => getMyLink().then(link => setMyLink(link ?? null))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col max-w-lg mx-auto">
      <header className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-4 py-4 border-b border-amber-400/20 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-black text-zinc-100 tracking-tight">
            From Street to Strait
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">บันทึกค่าใช้จ่ายกลุ่ม</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors mt-1"
        >
          ออกจากระบบ
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
            currentMemberId={myLink.member_id}
            onDeleted={refreshExpenses}
            onEdit={handleEditExpense}
            onFlagged={refreshExpenses}
          />
        )}
        {tab === 'balances' && <BalanceSummary data={balances} />}
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
