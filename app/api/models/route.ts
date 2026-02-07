import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        // Fetch models from v1beta API which often has the newest/preview models
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json();

        // Filter for models that support relevant methods
        const models = (data.models || [])
            .filter((m: any) =>
                m.supportedGenerationMethods?.includes('generateContent') ||
                m.supportedGenerationMethods?.includes('predict') ||
                m.supportedGenerationMethods?.includes('predictLongRunning')
            )
            .map((m: any) => {
                const id = m.name.replace('models/', '');
                let family = 'Other';
                let type: 'text' | 'image' | 'video' = 'text';

                if (id.toLowerCase().includes('imagen')) {
                    family = 'Imagen (Images)';
                    type = 'image';
                } else if (id.toLowerCase().includes('veo')) {
                    family = 'Veo (Video)';
                    type = 'video';
                } else if (id.toLowerCase().includes('gemini')) {
                    family = 'Gemini';
                    // Special case for image-specialized Gemini models
                    if (id.toLowerCase().includes('image')) type = 'image';
                } else if (id.toLowerCase().includes('gemma')) {
                    family = 'Gemma';
                } else if (id.toLowerCase().includes('nano') || id.toLowerCase().includes('banana')) {
                    family = 'Experimental/Nano';
                    if (id.toLowerCase().includes('image')) type = 'image';
                }

                return {
                    id,
                    displayName: m.displayName,
                    description: m.description,
                    version: m.version,
                    family,
                    type
                };
            })
            .sort((a: any, b: any) => {
                // Sort by family first, then by ID
                if (a.family !== b.family) return a.family.localeCompare(b.family);
                return b.id.localeCompare(a.id);
            });

        return NextResponse.json({ models });

    } catch (error: any) {
        console.error('Error listing models:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
