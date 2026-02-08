import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, mode, image, startFrame, endFrame } = body;
        // mode: 'text' | 'image' | 'interpolation'

        if (!prompt && mode === 'text') {
            return NextResponse.json({ error: 'Prompt is required for text-to-video' }, { status: 400 });
        }

        let googleAuthOptions;
        let projectId = process.env.GCP_PROJECT_ID || 'tilda-3-485901';

        // Check for Service Account JSON in environment variables
        if (process.env.VERTEX_CREDENTIALS) {
            try {
                const credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
                googleAuthOptions = { credentials };
                projectId = credentials.project_id || projectId;
            } catch (e) {
                console.error("Failed to parse VERTEX_CREDENTIALS for Veo", e);
            }
        }

        const LOCATION = 'us-central1';
        const MODEL = 'veo-001'; // Or veo-2.0-generate-001 if available

        const vertexAI = new VertexAI({
            project: projectId,
            location: LOCATION,
            googleAuthOptions: googleAuthOptions
        });

        const model = vertexAI.getGenerativeModel({ model: MODEL });

        console.log(`[Veo] Generating (${mode}) with ${MODEL}...`);

        let parts: any[] = [];

        if (mode === 'text') {
            parts.push({ text: prompt });
        }
        else if (mode === 'image' && image) {
            // Image-to-Video
            const base64 = image.includes('base64,') ? image.split('base64,')[1] : image;
            parts.push({ inlineData: { mimeType: 'image/png', data: base64 } });
            if (prompt) parts.push({ text: prompt });
        }
        else if (mode === 'interpolation' && startFrame && endFrame) {
            // Frame Interpolation (Start + End)
            // Note: The specific API shape for interpolation might differ. 
            // Assuming multimodal input sequence: Image1, Image2, Prompt (optional)
            const startBase64 = startFrame.includes('base64,') ? startFrame.split('base64,')[1] : startFrame;
            const endBase64 = endFrame.includes('base64,') ? endFrame.split('base64,')[1] : endFrame;

            parts.push({ inlineData: { mimeType: 'image/png', data: startBase64 } });
            parts.push({ inlineData: { mimeType: 'image/png', data: endBase64 } });
            if (prompt) parts.push({ text: prompt });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });

        const responseParts = result.response.candidates?.[0]?.content?.parts || [];

        // 1. Check for video/mp4 inline data
        const videoPart = responseParts.find((p: any) => p.inlineData?.mimeType?.includes('video'));
        if (videoPart && videoPart.inlineData) {
            return NextResponse.json({
                video: `data:${videoPart.inlineData.mimeType};base64,${videoPart.inlineData.data}`,
                metadata: result.response.usageMetadata
            });
        }

        // 2. Check for GCS URI (common for large video outputs)
        const filePart = responseParts.find((p: any) => p.fileData);
        if (filePart) {
            return NextResponse.json({
                videoUrl: filePart.fileData?.fileUri,
                metadata: result.response.usageMetadata
            });
        }

        return NextResponse.json({
            error: "No video generated.",
            raw: JSON.stringify(responseParts)
        }, { status: 500 });


    } catch (error: any) {
        console.error('[Veo API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
