import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { db } from '@/lib/db';
import { calculateBalances, calculateSettlements } from '@/lib/balance';

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: 'groupId is required' },
        { status: 400 }
      );
    }

    const group = db.getGroupById(groupId);
    if (!group || group.userId !== auth.userId) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const expenses = db.getExpensesByGroupId(groupId);
    const participants = db.getParticipantsByGroupId(groupId);
    const user = db.getUserById(auth.userId);
    const balances = calculateBalances(groupId, auth.userId);
    const settlements = calculateSettlements(balances);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseCount = expenses.length;

    // Generate summary
    const summary = `Group Summary for "${group.name}":

Total Expenses: ${expenseCount} expense${expenseCount !== 1 ? 's' : ''}
Total Amount: $${totalSpent.toFixed(2)}

Participants: ${participants.length + 1} (including you)
${participants.map(p => `- ${p.name}`).join('\n')}

Current Balances:
${balances.map(b => {
  if (b.netBalance > 0) {
    return `- ${b.participantName} owes $${b.netBalance.toFixed(2)}`;
  } else if (b.netBalance < 0) {
    return `- ${b.participantName} is owed $${Math.abs(b.netBalance).toFixed(2)}`;
  }
  return `- ${b.participantName} is settled`;
}).join('\n')}

${settlements.length > 0 ? `\nSettlement Suggestions:\n${settlements.map((s, i) => {
  const from = balances.find(b => b.participantId === s.from);
  const to = balances.find(b => b.participantId === s.to);
  return `${i + 1}. ${from?.participantName || 'Someone'} should pay ${to?.participantName || 'someone'} $${s.amount.toFixed(2)}`;
}).join('\n')}` : '\nAll balances are settled!'}`;

    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 400 }
    );
  }
}
