import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

function calculateSplits(
  amount: number,
  splitMode: 'equal' | 'custom' | 'percentage',
  participantIds: string[],
  customAmounts?: { participantId: string; amount: number }[],
  percentages?: { participantId: string; percentage: number }[]
): { participantId: string; amount: number }[] {
  if (splitMode === 'equal') {
    const splitAmount = Math.round((amount / participantIds.length) * 100) / 100;
    const splits = participantIds.map(id => ({
      participantId: id,
      amount: splitAmount,
    }));
    // Handle rounding differences
    const total = splits.reduce((sum, s) => sum + s.amount, 0);
    const difference = amount - total;
    if (Math.abs(difference) > 0.01) {
      splits[0].amount = Math.round((splits[0].amount + difference) * 100) / 100;
    }
    return splits;
  }

  if (splitMode === 'custom' && customAmounts) {
    return customAmounts.map(ca => ({
      participantId: ca.participantId,
      amount: Math.round(ca.amount * 100) / 100,
    }));
  }

  if (splitMode === 'percentage' && percentages) {
    return percentages.map(p => ({
      participantId: p.participantId,
      amount: Math.round((amount * p.percentage / 100) * 100) / 100,
    }));
  }

  throw new Error('Invalid split configuration');
}

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groupId = request.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json(
      { error: 'groupId is required' },
      { status: 400 }
    );
  }

  // Verify group belongs to user
  const group = db.getGroupById(groupId);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const expenses = db.getExpensesByGroupId(groupId);
  return NextResponse.json({ expenses });
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      amount,
      description,
      date,
      payerId,
      groupId,
      participantIds,
      splitMode,
      customAmounts,
      percentages,
    } = await request.json();

    if (!amount || !description || !date || !payerId || !groupId || !participantIds || !splitMode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify group belongs to user
    const group = db.getGroupById(groupId);
    if (!group || group.userId !== auth.userId) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const splits = calculateSplits(amount, splitMode, participantIds, customAmounts, percentages);

    const expense = {
      id: crypto.randomUUID(),
      amount: Math.round(amount * 100) / 100,
      description,
      date,
      payerId,
      groupId,
      participantIds,
      splitMode,
      splits,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createExpense(expense);
    return NextResponse.json({ expense });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 400 }
    );
  }
}
