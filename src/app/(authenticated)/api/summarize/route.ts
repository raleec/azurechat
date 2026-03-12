// src/app/(authenticated)/api/summarize/route.ts
import { NextResponse } from 'next/server';
import { OpenAIInstance } from '../../../features/common/services/openai';

const openai = new OpenAIInstance();

export async function POST(req: Request) {
    const { conversationHistory, largeText } = await req.json();
    // Validation and summarization logic
    if (!conversationHistory && !largeText) {
        return NextResponse.json({ error: 'No input provided.' }, { status: 400 });
    }
    // Summarization logic here
    const summarized = await openai.summarize(conversationHistory, largeText);
    return NextResponse.json({ summary: summarized });
}
