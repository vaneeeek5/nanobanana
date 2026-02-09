import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode, referenceImages } = body;

        // Configuration from "Working Version"
        const LOCATION = 'europe-west1'; // CRITICAL: This was the key difference
        const MODEL_ID = 'gemini-2.5-flash-image';

        let projectId = 'tilda-3-485901';
        let googleAuthOptions;

        if (process.env.VERTEX_CREDENTIALS) {
            try {
                const credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
                googleAuthOptions = { credentials };
                projectId = credentials.project_id || projectId;
            } catch (e) {
                console.error("Failed to parse VERTEX_CREDENTIALS", e);
            }
        }

        const vertexAI = new VertexAI({
            project: projectId,
            location: LOCATION,
            googleAuthOptions: googleAuthOptions
        });

        const model = vertexAI.getGenerativeModel({ model: MODEL_ID });

        console.log(`[NanoBanana-Vertex] Generating with ${MODEL_ID} in ${LOCATION}...`);

        const parts: any[] = [{ text: prompt }];

        if (referenceImages && referenceImages.length > 0) {
            referenceImages.forEach((img: string) => {
                // Cleanup base64 if needed (legacy code did this)
                const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
                parts.push({
                    inlineData: {
                        mimeType: "image/png",
                        data: cleanBase64
                    }
                });
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
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
        console.error('[NanoBanana-Vertex API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
