import { useState, useEffect, useCallback, useMemo } from 'react';
import MembersSettings from './components/MembersSettings';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseList from './components/ExpenseList';
import BalanceSummary from './components/BalanceSummary';
import { getMembers, getExpenses } from './api';
import { calculateBalances } from './utils/balances';

const TABS = [
  { id: 'members', label: 'สมาชิก', icon: '👥' },
  { id: 'add',     label: 'เพิ่ม',   icon: '➕' },
  { id: 'list',    label: 'รายการ',  icon: '📋' },
  { id: 'balances',label: 'สรุป',    icon: '💰' },
];

export default function App() {
  const [tab, setTab] = useState('add');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);

  const refreshMembers = useCallback(async () => {
    setMembers(await getMembers());
  }, []);

  const refreshExpenses = useCallback(async () => {
    setExpenses(await getExpenses());
  }, []);

  useEffect(() => {
    refreshMembers();
    refreshExpenses();
  }, [refreshMembers, refreshExpenses]);

  const balances = useMemo(
    () => (members.length > 0 ? calculateBalances(members, expenses) : null),
    [members, expenses]
  );

  function handleEditExpense(expense) {
    setEditingExpense(expense);
    setTab('add');
  }

  function handleTabChange(id) {
    setTab(id);
    if (id !== 'add') setEditingExpense(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">
      <header className="bg-indigo-600 text-white px-4 py-3 shadow-md">
        <h1 className="text-lg font-bold">From Street to Strait 🌏</h1>
        <p className="text-xs text-indigo-200">บันทึกค่าใช้จ่ายกลุ่ม</p>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'members' && (
          <MembersSettings members={members} onChanged={refreshMembers} />
        )}
        {tab === 'add' && (
          <AddExpenseForm
            members={members}
            editingExpense={editingExpense}
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
            onDeleted={refreshExpenses}
            onEdit={handleEditExpense}
          />
        )}
        {tab === 'balances' && <BalanceSummary data={balances} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
              tab === t.id ? 'text-indigo-600 font-semibold' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
