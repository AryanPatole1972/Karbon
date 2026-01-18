import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

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

  const participants = db.getParticipantsByGroupId(groupId);
  return NextResponse.json({ participants });
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, groupId, color, avatar } = await request.json();

    if (!name || !groupId) {
      return NextResponse.json(
        { error: 'Name and groupId are required' },
        { status: 400 }
      );
    }

    // Verify group belongs to user
    const group = db.getGroupById(groupId);
    if (!group || group.userId !== auth.userId) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check participant limit
    const existingParticipants = db.getParticipantsByGroupId(groupId);
    if (existingParticipants.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 participants allowed per group' },
        { status: 400 }
      );
    }

    const participant = {
      id: crypto.randomUUID(),
      name,
      groupId,
      color: color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      avatar,
    };

    db.createParticipant(participant);
    
    // Add to group
    group.participantIds.push(participant.id);
    db.updateGroup(groupId, { participantIds: group.participantIds });

    return NextResponse.json({ participant });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create participant' },
      { status: 400 }
    );
  }
}
