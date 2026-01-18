import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const participant = db.getParticipantById(params.id);
  if (!participant) {
    return NextResponse.json(
      { error: 'Participant not found' },
      { status: 404 }
    );
  }

  // Verify group belongs to user
  const group = db.getGroupById(participant.groupId);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, color, avatar } = await request.json();
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (avatar !== undefined) updates.avatar = avatar;

    db.updateParticipant(params.id, updates);
    const updatedParticipant = db.getParticipantById(params.id);
    return NextResponse.json({ participant: updatedParticipant });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update participant' },
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

  const participant = db.getParticipantById(params.id);
  if (!participant) {
    return NextResponse.json(
      { error: 'Participant not found' },
      { status: 404 }
    );
  }

  // Verify group belongs to user
  const group = db.getGroupById(participant.groupId);
  if (!group || group.userId !== auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  db.deleteParticipant(params.id);
  return NextResponse.json({ success: true });
}
