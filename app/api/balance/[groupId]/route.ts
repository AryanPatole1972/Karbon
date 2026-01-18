import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { calculateBalances, calculateSettlements } from '@/lib/balance';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = db.getGroupById(params.groupId);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const balances = calculateBalances(params.groupId, auth.userId);
  const settlements = calculateSettlements(balances);

  // Calculate totals
  const expenses = db.getExpensesByGroupId(params.groupId);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const userBalance = balances.find(b => b.participantId === auth.userId);
  const totalOwed = userBalance && userBalance.netBalance > 0.01 ? userBalance.netBalance : 0;
  const totalOwedToUser = userBalance && userBalance.netBalance < -0.01 ? Math.abs(userBalance.netBalance) : 0;

  return NextResponse.json({
    balances,
    settlements,
    totals: {
      totalSpent,
      totalOwed,
      totalOwedToUser,
    },
  });
}
