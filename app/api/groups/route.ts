import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groups = db.getGroupsByUserId(auth.userId);
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, participantIds = [] } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (participantIds.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 participants allowed' },
        { status: 400 }
      );
    }

    const group = {
      id: crypto.randomUUID(),
      name,
      userId: auth.userId,
      participantIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createGroup(group);
    return NextResponse.json({ group });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create group' },
      { status: 400 }
    );
  }
}
