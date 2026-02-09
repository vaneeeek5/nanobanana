import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GOOGLE_API_KEY is not configured" }, { status: 500 });
        }

        const body = await req.json();
        const { prompt } = body;

        // User requested Veo via Studio (AI Studio API)
        // Model: veo-3.1-generate-preview (confirmed by user screenshot)

        console.log(`[Veo-Studio] Generating with veo-3.1-generate-preview...`);

        // Direct REST call to AI Studio
        const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({
                error: `AI Studio Error: ${response.status} - ${errText}`
            }, { status: response.status });
        }

        const data = await response.json();
        console.log("[Veo-Studio] Response:", JSON.stringify(data).substring(0, 200));

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[Veo-Studio API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
