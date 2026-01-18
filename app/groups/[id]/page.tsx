'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { apiRequest } from '@/lib/api';
import { Plus, Edit, Trash2, Search, Filter, DollarSign, TrendingUp, TrendingDown, Sparkles, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Participant {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  groupId: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  payerId: string;
  groupId: string;
  participantIds: string[];
  splitMode: 'equal' | 'custom' | 'percentage';
  splits: { participantId: string; amount: number }[];
}

interface Balance {
  participantId: string;
  participantName: string;
  netBalance: number;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface Group {
  id: string;
  name: string;
  participantIds: string[];
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totals, setTotals] = useState({ totalSpent: 0, totalOwed: 0, totalOwedToUser: 0 });
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParticipant, setFilterParticipant] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showMintSense, setShowMintSense] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    loadData();
  }, [groupId, router]);

  const loadData = async () => {
    try {
      const [groupData, participantsData, expensesData, balanceData] = await Promise.all([
        apiRequest<{ group: Group }>(`/api/groups/${groupId}`),
        apiRequest<{ participants: Participant[] }>(`/api/participants?groupId=${groupId}`),
        apiRequest<{ expenses: Expense[] }>(`/api/expenses?groupId=${groupId}`),
        apiRequest<{ balances: Balance[]; settlements: Settlement[]; totals: any }>(`/api/balance/${groupId}`),
      ]);

      setGroup(groupData.group);
      setParticipants(participantsData.participants);
      setExpenses(expensesData.expenses);
      setBalances(balanceData.balances);
      setSettlements(balanceData.settlements);
      setTotals(balanceData.totals);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('Are you sure? This will remove the participant from all expenses.')) return;
    try {
      await apiRequest(`/api/participants/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesParticipant = !filterParticipant || 
      expense.participantIds.includes(filterParticipant) || 
      expense.payerId === filterParticipant;
    return matchesSearch && matchesParticipant;
  });

  const allParticipants = [
    ...participants,
    ...(user ? [{ id: user.id, name: user.name || 'You', groupId } as Participant] : []),
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p>Group not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary-600 hover:text-primary-800 mb-4"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowMintSense(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>MintSense AI</span>
              </button>
              <button
                onClick={() => setShowParticipantModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
                disabled={participants.length >= 3}
              >
                <Plus className="w-5 h-5" />
                <span>Add Participant</span>
              </button>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setShowExpenseModal(true);
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">${totals.totalSpent.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">You Owe</p>
                <p className="text-2xl font-bold text-red-600">${totals.totalOwed.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Owed to You</p>
                <p className="text-2xl font-bold text-green-600">${totals.totalOwedToUser.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Participants</h2>
          <div className="flex flex-wrap gap-3">
            {allParticipants.map((p) => (
              <div
                key={p.id}
                className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: p.color || '#22c55e' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-900">{p.name}</span>
                {p.id !== user?.id && (
                  <button
                    onClick={() => handleDeleteParticipant(p.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Balance Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Balances</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Participant</th>
                  <th className="text-right py-2 px-4">Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.participantId} className="border-b">
                    <td className="py-2 px-4">{balance.participantName}</td>
                    <td className={`text-right py-2 px-4 font-semibold ${
                      balance.netBalance > 0 ? 'text-red-600' : balance.netBalance < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {balance.netBalance > 0 ? `Owes $${balance.netBalance.toFixed(2)}` :
                       balance.netBalance < 0 ? `Owed $${Math.abs(balance.netBalance).toFixed(2)}` :
                       'Settled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {settlements.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-2">Settlement Suggestions:</h3>
              <ul className="space-y-1">
                {settlements.map((s, i) => {
                  const fromName = allParticipants.find(p => p.id === s.from)?.name || 'Unknown';
                  const toName = allParticipants.find(p => p.id === s.to)?.name || 'Unknown';
                  return (
                    <li key={i} className="text-sm text-gray-600">
                      {fromName} should pay {toName} ${s.amount.toFixed(2)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterParticipant}
            onChange={(e) => setFilterParticipant(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Participants</option>
            {allParticipants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Expenses</h2>
          </div>
          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No expenses found. Add your first expense to get started!
            </div>
          ) : (
            <div className="divide-y">
              {filteredExpenses.map((expense) => {
                const payer = allParticipants.find(p => p.id === expense.payerId);
                return (
                  <div key={expense.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                          <span className="text-2xl font-bold text-primary-600">${expense.amount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Paid by <span className="font-semibold">{payer?.name || 'Unknown'}</span> on{' '}
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {expense.splits.map((split) => {
                            const participant = allParticipants.find(p => p.id === split.participantId);
                            return (
                              <span
                                key={split.participantId}
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                              >
                                {participant?.name || 'Unknown'}: ${split.amount.toFixed(2)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingExpense(expense);
                            setShowExpenseModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          expense={editingExpense}
          groupId={groupId}
          participants={allParticipants}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSave={loadData}
        />
      )}

      {/* Participant Modal */}
      {showParticipantModal && (
        <ParticipantModal
          groupId={groupId}
          onClose={() => setShowParticipantModal(false)}
          onSave={loadData}
        />
      )}

      {/* MintSense AI Modal */}
      {showMintSense && (
        <MintSenseModal
          groupId={groupId}
          participants={allParticipants}
          onClose={() => setShowMintSense(false)}
          onExpenseCreated={loadData}
        />
      )}
    </>
  );
}

// MintSense AI Modal Component
function MintSenseModal({
  groupId,
  participants,
  onClose,
  onExpenseCreated,
}: {
  groupId: string;
  participants: Participant[];
  onClose: () => void;
  onExpenseCreated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'parse' | 'summary'>('parse');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [parsedExpense, setParsedExpense] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleParse = async () => {
    if (!naturalLanguage.trim()) return;
    setLoading(true);
    try {
      const data = await apiRequest<{
        amount: number | null;
        description: string;
        date: string;
        category: string;
        confidence: number;
      }>('/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({ text: naturalLanguage }),
      });
      setParsedExpense(data);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromParsed = async () => {
    if (!parsedExpense || !parsedExpense.amount) {
      alert('Please parse an expense first');
      return;
    }

    try {
      await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          description: parsedExpense.description,
          amount: parsedExpense.amount,
          date: parsedExpense.date,
          payerId: participants[0]?.id || '',
          groupId,
          participantIds: participants.map(p => p.id),
          splitMode: 'equal',
        }),
      });
      onExpenseCreated();
      setNaturalLanguage('');
      setParsedExpense(null);
      alert('Expense created successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await apiRequest<{ summary: string }>('/api/ai/group-summary', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });
      setSummary(data.summary);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold">MintSense AI</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex space-x-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab('parse')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'parse'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Parse Expense
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'summary'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Group Summary
          </button>
        </div>

        {activeTab === 'parse' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter expense in natural language
              </label>
              <textarea
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                placeholder="e.g., Paid $50 for dinner at restaurant yesterday"
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: "Spent $30 on groceries", "Paid $25 for gas today", "Dinner cost $60 yesterday"
              </p>
            </div>

            <button
              onClick={handleParse}
              disabled={loading || !naturalLanguage.trim()}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Parsing...' : 'Parse with AI'}
            </button>

            {parsedExpense && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <h4 className="font-semibold mb-2">Parsed Expense:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Description:</strong> {parsedExpense.description}</p>
                  {parsedExpense.amount && (
                    <p><strong>Amount:</strong> ${parsedExpense.amount.toFixed(2)}</p>
                  )}
                  <p><strong>Date:</strong> {parsedExpense.date}</p>
                  <p><strong>Category:</strong> {parsedExpense.category}</p>
                  <p><strong>Confidence:</strong> {(parsedExpense.confidence * 100).toFixed(0)}%</p>
                </div>
                {parsedExpense.amount && (
                  <button
                    onClick={handleCreateFromParsed}
                    className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
                  >
                    Create Expense
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>{summaryLoading ? 'Generating...' : 'Generate Group Summary'}</span>
            </button>

            {summary && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h4 className="font-semibold mb-2">Group Summary:</h4>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {summary}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Expense Modal Component
function ExpenseModal({
  expense,
  groupId,
  participants,
  onClose,
  onSave,
}: {
  expense: Expense | null;
  groupId: string;
  participants: Participant[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [payerId, setPayerId] = useState(expense?.payerId || participants[0]?.id || '');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom' | 'percentage'>(expense?.splitMode || 'equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    expense?.participantIds || participants.map(p => p.id)
  );
  const [customAmounts, setCustomAmounts] = useState<{ participantId: string; amount: number }[]>(
    expense?.splits || []
  );
  const [percentages, setPercentages] = useState<{ participantId: string; percentage: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expenseData: any = {
        description,
        amount: parseFloat(amount),
        date,
        payerId,
        groupId,
        participantIds: selectedParticipants,
        splitMode,
      };

      if (splitMode === 'custom') {
        expenseData.customAmounts = customAmounts;
      } else if (splitMode === 'percentage') {
        expenseData.percentages = percentages;
      }

      if (expense) {
        await apiRequest(`/api/expenses/${expense.id}`, {
          method: 'PUT',
          body: JSON.stringify(expenseData),
        });
      } else {
        await apiRequest('/api/expenses', {
          method: 'POST',
          body: JSON.stringify(expenseData),
        });
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEqualSplit = () => {
    if (selectedParticipants.length === 0) return;
    const splitAmount = parseFloat(amount) / selectedParticipants.length;
    setCustomAmounts(
      selectedParticipants.map(id => ({
        participantId: id,
        amount: Math.round(splitAmount * 100) / 100,
      }))
    );
  };

  useEffect(() => {
    if (splitMode === 'equal' && amount && selectedParticipants.length > 0) {
      updateEqualSplit();
    }
  }, [splitMode, amount, selectedParticipants.length]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{expense ? 'Edit' : 'Add'} Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Split Mode</label>
            <select
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="equal">Equal</option>
              <option value="custom">Custom Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
            <div className="space-y-2">
              {participants.map((p) => (
                <label key={p.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants([...selectedParticipants, p.id]);
                      } else {
                        setSelectedParticipants(selectedParticipants.filter(id => id !== p.id));
                      }
                    }}
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {splitMode === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Amounts</label>
              {selectedParticipants.map((pid) => {
                const participant = participants.find(p => p.id === pid);
                const customAmount = customAmounts.find(ca => ca.participantId === pid);
                return (
                  <div key={pid} className="flex items-center space-x-2 mb-2">
                    <span className="w-32">{participant?.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customAmount?.amount || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setCustomAmounts([
                          ...customAmounts.filter(ca => ca.participantId !== pid),
                          { participantId: pid, amount: value },
                        ]);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {splitMode === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentages</label>
              {selectedParticipants.map((pid) => {
                const participant = participants.find(p => p.id === pid);
                const percentage = percentages.find(p => p.participantId === pid);
                return (
                  <div key={pid} className="flex items-center space-x-2 mb-2">
                    <span className="w-32">{participant?.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={percentage?.percentage || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setPercentages([
                          ...percentages.filter(p => p.participantId !== pid),
                          { participantId: pid, percentage: value },
                        ]);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span>%</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : expense ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Participant Modal Component
function ParticipantModal({
  groupId,
  onClose,
  onSave,
}: {
  groupId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/api/participants', {
        method: 'POST',
        body: JSON.stringify({ name, groupId, color }),
      });
      onSave();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Add Participant</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
