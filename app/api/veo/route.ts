import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tilda-3-485901';
        const LOCATION = 'us-central1'; // Veo is primarily in us-central1
        const MODEL = 'veo-001';

        const vertexAI = new VertexAI({
            project: PROJECT_ID,
            location: LOCATION
        });

        const model = vertexAI.getGenerativeModel({
            model: MODEL
        });

        console.log(`Generating video with ${MODEL} in ${LOCATION}...`);

        // Video generation can take time, but the SDK may return a response with the video data 
        // or a gcsUri. For this implementation, we assume a direct response or an error.
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const responseParts = result.response.candidates?.[0]?.content?.parts || [];

        // Look for video data (inlineData with video/mp4)
        const videoPart = responseParts.find((p: any) => p.inlineData?.mimeType?.includes('video'));

        if (videoPart && videoPart.inlineData) {
            return NextResponse.json({
                video: `data:${videoPart.inlineData.mimeType};base64,${videoPart.inlineData.data}`,
                text: "Video generated successfully."
            });
        }

        // Check for fileData (GCS URI)
        const filePart = responseParts.find((p: any) => p.fileData);
        if (filePart && filePart.fileData) {
            return NextResponse.json({
                videoUrl: filePart.fileData.fileUri,
                text: "Video generated as GCS URI."
            });
        }

        const textResponse = responseParts.find((p: any) => p.text)?.text;
        return NextResponse.json({
            text: textResponse || "Video generation request sent, but no immediate preview available.",
            note: "Video generation might be asynchronous on newer models."
        });

    } catch (error: any) {
        console.error('Veo Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
