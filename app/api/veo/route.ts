import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GOOGLE_API_KEY is not configured" }, { status: 500 });
        }

        const body = await req.json();
        const { prompt, mode } = body;

        // Note: Veo on Gemini API is very new (Private Preview).
        // User specified model: veo-3.1-generate-preview

        const genAI = new GoogleGenerativeAI(apiKey);

        // Accessing model.
        // For video, we might need to use a specific method or model.
        // If SDK doesn't support 'generateVideo' natively yet, we might need to rely on `generateContent` with a tailored prompt
        // or just return a placeholder explanation if it fails.
        // The user linked a blog post saying it IS available.

        // User specified model: veo-3.1-generate-preview
        const modelId = 'veo-3.1-generate-preview';
        const model = genAI.getGenerativeModel({ model: modelId });

        console.log(`[Veo-Gemini] Generating with ${modelId}...`);

        let result;
        try {
            result = await model.generateContent(prompt);
        } catch (genError: any) {
            console.error(`[Veo-Gemini] Generation failed for ${modelId}:`, genError.message);
            // Return formatted error to UI so user knows model is unavailable/invalid
            return NextResponse.json({
                error: `Model ${modelId} unavailable or returned error: ${genError.message}. Check access or model ID.`
            }, { status: 404 });
        }

        const response = await result.response;

        // Inspect response for video URI
        console.log("Veo Gemini Response:", response.text());

        // If the model returns a URI in text (unlikely for pure generation without tool)
        // or if it returns inline data (more likely).

        // Placeholder return for now as we can't inspect real output without running it successfully once.
        return NextResponse.json({
            message: "Request sent to Gemini API Veo model.",
            response: response.text()
        });

    } catch (error: any) {
        console.error('[Veo-Gemini API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
