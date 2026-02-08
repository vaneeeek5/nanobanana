import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, imageBase64, images, modelId } = body;

        let googleAuthOptions;
        let projectId = process.env.GCP_PROJECT_ID || 'tilda-3-485901';

        // Check for Service Account JSON in environment variables
        if (process.env.VERTEX_CREDENTIALS) {
            try {
                const credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
                googleAuthOptions = { credentials };
                projectId = credentials.project_id || projectId;
                console.log(`Using Service Account Credentials for project: ${projectId}`);
            } catch (e) {
                console.error("Failed to parse VERTEX_CREDENTIALS JSON", e);
            }
        }

        const targetModel = (modelId as string) || 'imagen-3.0-generate-001';

        // Location logic: Imagen and newer models often require specific regions like us-central1
        const LOCATION = 'us-central1';

        const vertexAI = new VertexAI({
            project: projectId,
            location: LOCATION,
            googleAuthOptions: googleAuthOptions
        });

        const model = vertexAI.getGenerativeModel({
            model: targetModel
        });

        // Prepare content parts
        let parts: any[] = [{ text: prompt }];

        if (images && Array.isArray(images)) {
            images.forEach((img: string) => {
                const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
                parts.push({
                    inlineData: { mimeType: "image/png", data: cleanBase64 }
                });
            });
        } else if (imageBase64) {
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({
                inlineData: { mimeType: "image/png", data: cleanBase64 }
            });
        }

        console.log(`[Vertex AI] Generating with ${targetModel} in ${LOCATION}...`);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });

        const responseParts = result.response.candidates?.[0]?.content?.parts || [];

        // Check for image data (Imagen specific response structure might vary but usually inlineData)
        const imagePart = responseParts.find((p: any) => p.inlineData?.data);
        if (imagePart) {
            return NextResponse.json({
                image: `data:image/png;base64,${imagePart.inlineData?.data}`,
                text: "Image generated via Vertex AI (Imagen 3)."
            });
        }

        const textResponse = responseParts.find((p: any) => p.text)?.text;
        return NextResponse.json({
            text: textResponse || "No content returned.",
            note: "Authorized via Service Account JSON."
        });

    } catch (error: any) {
        console.error('[Vertex AI] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
