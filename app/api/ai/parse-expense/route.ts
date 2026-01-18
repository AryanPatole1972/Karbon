import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Simple natural language parsing (can be enhanced with actual AI/ML)
    const lowerText = text.toLowerCase();

    // Extract amount
    const amountMatch = lowerText.match(/(?:paid|spent|cost|for)\s*\$?(\d+(?:\.\d{2})?)/) ||
                       lowerText.match(/\$(\d+(?:\.\d{2})?)/) ||
                       lowerText.match(/(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    // Extract description
    const descriptionMatch = text.match(/(?:for|on|at)\s+([^$0-9]+?)(?:\s+\$|\s+\d|$)/i) ||
                           text.match(/(.+?)(?:\s+\$|\s+\d)/);
    let description = descriptionMatch ? descriptionMatch[1].trim() : text;

    // Auto-categorize
    let category = 'Other';
    if (lowerText.match(/(?:food|restaurant|dinner|lunch|breakfast|eat|meal)/)) {
      category = 'Food & Dining';
    } else if (lowerText.match(/(?:gas|fuel|petrol|uber|taxi|transport|travel)/)) {
      category = 'Transportation';
    } else if (lowerText.match(/(?:hotel|accommodation|stay|room)/)) {
      category = 'Accommodation';
    } else if (lowerText.match(/(?:grocery|shopping|store|buy)/)) {
      category = 'Shopping';
    } else if (lowerText.match(/(?:entertainment|movie|concert|show|game)/)) {
      category = 'Entertainment';
    } else if (lowerText.match(/(?:utility|bill|electric|water|internet|phone)/)) {
      category = 'Utilities';
    }

    // Extract date (simple patterns)
    const today = new Date();
    let date = today.toISOString().split('T')[0];
    
    if (lowerText.match(/(?:yesterday|yday)/)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      date = yesterday.toISOString().split('T')[0];
    } else if (lowerText.match(/(?:today|now)/)) {
      date = today.toISOString().split('T')[0];
    } else {
      // Try to find date patterns
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        const year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
        const parsedDate = new Date(year, month - 1, day);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
        }
      }
    }

    return NextResponse.json({
      amount,
      description: description || 'Expense',
      date,
      category,
      confidence: amount ? 0.8 : 0.5, // Simple confidence score
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to parse expense' },
      { status: 400 }
    );
  }
}
