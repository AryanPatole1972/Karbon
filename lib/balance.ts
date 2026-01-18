import { db, Expense, Participant } from './db';

export interface Balance {
  participantId: string;
  participantName: string;
  netBalance: number; // positive = owes, negative = is owed
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function calculateBalances(groupId: string, userId: string): Balance[] {
  const expenses = db.getExpensesByGroupId(groupId);
  const participants = db.getParticipantsByGroupId(groupId);
  const user = db.getUserById(userId);
  
  // Include primary user in participants
  const allParticipants = [
    ...participants,
    { id: userId, name: user?.name || 'You', groupId } as Participant,
  ];

  const balances: Map<string, number> = new Map();
  allParticipants.forEach(p => balances.set(p.id, 0));

  // Calculate net balance for each participant
  expenses.forEach(expense => {
    // Payer paid the full amount
    const payerBalance = balances.get(expense.payerId) || 0;
    balances.set(expense.payerId, payerBalance - expense.amount);

    // Each participant owes their share
    expense.splits.forEach(split => {
      const participantBalance = balances.get(split.participantId) || 0;
      balances.set(split.participantId, participantBalance + split.amount);
    });
  });

  return allParticipants.map(p => ({
    participantId: p.id,
    participantName: p.name,
    netBalance: balances.get(p.id) || 0,
  }));
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  const balancesCopy = balances.map(b => ({ ...b })).filter(b => Math.abs(b.netBalance) > 0.01);

  // Sort by balance (debtors first, then creditors)
  balancesCopy.sort((a, b) => b.netBalance - a.netBalance);

  let i = 0;
  let j = balancesCopy.length - 1;

  while (i < j) {
    const debtor = balancesCopy[i];
    const creditor = balancesCopy[j];

    if (Math.abs(debtor.netBalance) < 0.01) {
      i++;
      continue;
    }
    if (Math.abs(creditor.netBalance) < 0.01) {
      j--;
      continue;
    }

    const amount = Math.min(debtor.netBalance, Math.abs(creditor.netBalance));
    settlements.push({
      from: debtor.participantId,
      to: creditor.participantId,
      amount: Math.round(amount * 100) / 100,
    });

    debtor.netBalance -= amount;
    creditor.netBalance += amount;

    if (Math.abs(debtor.netBalance) < 0.01) i++;
    if (Math.abs(creditor.netBalance) < 0.01) j--;
  }

  return settlements;
}

export function calculateGroupTotals(groupId: string): {
  totalSpent: number;
  totalOwed: number;
  totalOwedToUser: number;
} {
  const expenses = db.getExpensesByGroupId(groupId);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate what user owes and is owed
  let totalOwed = 0;
  let totalOwedToUser = 0;

  expenses.forEach(expense => {
    expense.splits.forEach(split => {
      // This would need userId passed in, simplified for now
      // Will be calculated in the API route
    });
  });

  return {
    totalSpent,
    totalOwed: 0, // Will be calculated with userId
    totalOwedToUser: 0, // Will be calculated with userId
  };
}
