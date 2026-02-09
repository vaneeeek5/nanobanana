import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode, referenceImages } = body;

        // --- MODE: FAST (Nano Banana) -> Vertex AI (Europe) ---
        if (mode === 'fast') {
            console.log("[Imagen] Using Vertex AI (Europe) for Fast mode");
            const LOCATION = 'europe-west1';
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

            // Prepare parts for Vertex
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

            if (imagePart) {
                return NextResponse.json({
                    image: `data:image/png;base64,${imagePart.inlineData?.data}`,
                    metadata: result.response.usageMetadata
                });
            }
        }

        // --- MODE: PRO (Nano Banana Pro) -> AI Studio (Gemini API) ---
        else {
            console.log("[Imagen] Using AI Studio (Gemini API) for Pro mode");
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) return NextResponse.json({ error: "GOOGLE_API_KEY missing" }, { status: 500 });

            const genAI = new GoogleGenerativeAI(apiKey);
            // Correct ID from user's list-models output
            const MODEL_ID = 'gemini-3-pro-image-preview';

            const model = genAI.getGenerativeModel({ model: MODEL_ID });

            // Gemini API usually just returns text/multimodal, but for image models checking if it gives inlineData
            // Warning: The SDK might handle image response differently or via `generateImages` if available in future,
            // but for now we assume standard generateContent flow for this Preview model.

            const result = await model.generateContent(prompt);
            const response = await result.response;

            console.log("[Imagen-Pro] Raw Response Candidates:", JSON.stringify(response.candidates, null, 2));

            // Attempt to extract image from standard gemini content parts
            const parts = response.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData?.data);

            if (imagePart) {
                console.log("[Imagen-Pro] Found image data!");
                return NextResponse.json({
                    image: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
                    metadata: response.usageMetadata
                });
            }

            // Fallback if no image found
            return NextResponse.json({
                warning: "Model returned no image data.",
                rawResponse: response.text ? response.text() : "No text",
                candidates: response.candidates
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
