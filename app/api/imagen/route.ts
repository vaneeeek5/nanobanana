import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode, referenceImages, backendSource } = body; // backendSource: 'vertex' | 'studio'

        const isFast = mode === 'fast';
        // Model IDs
        // VERTEX: Use correct Imagen 3 ID for Pro
        const modelIdVertex = isFast ? 'gemini-2.5-flash-image' : 'imagen-3.0-generate-001';
        // STUDIO: Use the -image variant for Flash too (from user list)
        const modelIdStudio = isFast ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

        const MODEL_ID = backendSource === 'vertex' ? modelIdVertex : modelIdStudio;

        console.log(`[Imagen] Request: Mode=${mode}, Source=${backendSource}, Model=${MODEL_ID}`);

        // --- VERTEX AI PATH ---
        if (backendSource === 'vertex') {
            // Location logic: Flash is EU, Pro is likely US (preview)
            const LOCATION = isFast ? 'europe-west1' : 'us-central1';

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

            const parts: any[] = [{ text: prompt }];
            if (referenceImages?.length) {
                referenceImages.forEach((img: string) => {
                    const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
                    parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } });
                });
            }

            const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
            const responseParts = result.response.candidates?.[0]?.content?.parts || [];
            const imagePart = responseParts.find((p: any) => p.inlineData?.data);

            if (imagePart && imagePart.inlineData) {
                return NextResponse.json({
                    image: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
                    metadata: result.response.usageMetadata
                });
            }
        }

        // --- AI STUDIO PATH ---
        else {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) return NextResponse.json({ error: "GOOGLE_API_KEY missing" }, { status: 500 });

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: MODEL_ID });

            const result = await model.generateContent(prompt);
            const response = await result.response;

            console.log(`[Imagen-Studio] Response candidates:`, response.candidates?.length);

            // Extract image
            const parts = response.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData?.data);

            if (imagePart && imagePart.inlineData) {
                return NextResponse.json({
                    image: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
                    metadata: response.usageMetadata
                });
            }

            return NextResponse.json({
                warning: "Studio returned no image data (text only?)",
                rawResponse: response.text ? response.text() : "No text",
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
