import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

// Helper to parse credentials
function getCredentials() {
    if (process.env.VERTEX_CREDENTIALS) {
        try {
            return JSON.parse(process.env.VERTEX_CREDENTIALS);
        } catch (e) {
            console.error("Failed to parse VERTEX_CREDENTIALS", e);
        }
    }
    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode, referenceImages, aspectRatio } = body;

        // Configuration based on mode
        // Falling back to standard public IDs to avoid 404s
        let modelId = 'imagen-3.0-generate-001';
        if (mode === 'fast') {
            modelId = 'imagen-3.0-fast-generate-001';
        }

        const credentials = getCredentials();
        const projectId = credentials?.project_id || process.env.GCP_PROJECT_ID || 'tilda-3-485901';

        const vertexAI = new VertexAI({
            project: projectId,
            location: 'us-central1', // Imagen 3 requires us-central1 (usually)
            googleAuthOptions: credentials ? { credentials } : undefined
        });

        const model = vertexAI.getGenerativeModel({ model: modelId });

        console.log(`[Imagen] Generating (${mode}) with ${modelId}...`);

        let parts: any[] = [{ text: prompt }];

        // Handle reference images (for editing/variations if supported by specific model version)
        // Note: Standard generateContent for Imagen 3 via Vertex SDK text-to-image usually just takes text.
        // If 'referenceImages' are provided, we might need to look into specific edit modes or controlnet-like features if available in public API.
        // For now, we will append them as multimodal inputs if the model supports it.
        if (referenceImages && Array.isArray(referenceImages)) {
            referenceImages.forEach((img: string) => {
                const base64 = img.includes('base64,') ? img.split('base64,')[1] : img;
                parts.push({
                    inlineData: { mimeType: 'image/png', data: base64 }
                });
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            // generationConfig parameter is removed as sampleCount caused 400 error
        });

        const responseParts = result.response.candidates?.[0]?.content?.parts || [];
        const imagePart = responseParts.find((p: any) => p.inlineData?.data);

        if (imagePart) {
            return NextResponse.json({
                image: `data:image/png;base64,${imagePart.inlineData?.data}`,
                metadata: result.response.usageMetadata
            });
        }

        return NextResponse.json({ error: "No image generated." }, { status: 500 });

    } catch (error: any) {
        console.error('[Imagen API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
