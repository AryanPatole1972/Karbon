import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = db.getGroupById(params.id);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  return NextResponse.json({ group });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = db.getGroupById(params.id);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  try {
    const { name, participantIds } = await request.json();

    if (participantIds && participantIds.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 participants allowed' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (participantIds !== undefined) updates.participantIds = participantIds;

    db.updateGroup(params.id, updates);
    const updatedGroup = db.getGroupById(params.id);
    return NextResponse.json({ group: updatedGroup });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update group' },
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

  const group = db.getGroupById(params.id);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  db.deleteGroup(params.id);
  return NextResponse.json({ success: true });
}
