import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        // Using Imagen 4 (predict method)
        const modelId = 'imagen-4.0-generate-001';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1"
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Imagen API Error');
        }

        const data = await response.json();
        const b64Image = data.predictions?.[0]?.bytesBase64Encoded;

        if (!b64Image) {
            throw new Error('No image was generated');
        }

        return NextResponse.json({
            image: `data:image/png;base64,${b64Image}`
        });

    } catch (error: any) {
        console.error('Imagen API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
