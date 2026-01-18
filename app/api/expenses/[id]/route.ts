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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expense = db.getExpenseById(params.id);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Verify group belongs to user
  const group = db.getGroupById(expense.groupId);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const {
      amount,
      description,
      date,
      payerId,
      participantIds,
      splitMode,
      customAmounts,
      percentages,
    } = await request.json();

    const updates: any = {};
    if (amount !== undefined) updates.amount = Math.round(amount * 100) / 100;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (payerId !== undefined) updates.payerId = payerId;
    if (participantIds !== undefined) updates.participantIds = participantIds;
    if (splitMode !== undefined) updates.splitMode = splitMode;

    // Recalculate splits if needed
    if (amount !== undefined || participantIds !== undefined || splitMode !== undefined) {
      const finalAmount = amount !== undefined ? amount : expense.amount;
      const finalParticipants = participantIds !== undefined ? participantIds : expense.participantIds;
      const finalSplitMode = splitMode !== undefined ? splitMode : expense.splitMode;
      
      updates.splits = calculateSplits(
        finalAmount,
        finalSplitMode,
        finalParticipants,
        customAmounts,
        percentages
      );
    }

    db.updateExpense(params.id, updates);
    const updatedExpense = db.getExpenseById(params.id);
    return NextResponse.json({ expense: updatedExpense });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expense = db.getExpenseById(params.id);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  // Verify group belongs to user
  const group = db.getGroupById(expense.groupId);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  db.deleteExpense(params.id);
  return NextResponse.json({ success: true });
}
