import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // Mock response for now
    return NextResponse.json({ status: 'success', message: 'Video generation started (mock)' });
}
