import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, imageBase64, modelId } = body;

        // Use environment variables or fallback values
        const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tilda-3-485901';
        const targetModel = (modelId as string) || 'gemini-1.5-pro';

        // Gemini 3 Preview is often only in us-central1
        const LOCATION = targetModel.includes('preview') || targetModel.includes('gemini-3') ? 'us-central1' : 'europe-west1';

        const vertexAI = new VertexAI({
            project: PROJECT_ID,
            location: LOCATION
        });

        const model = vertexAI.getGenerativeModel({
            model: targetModel
        });

        let parts: any[] = [{ text: prompt }];

        if (imageBase64) {
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: cleanBase64
                }
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });

        const responseParts = result.response.candidates?.[0]?.content?.parts || [];
        const imagePart = responseParts.find((p: any) => p.inlineData?.data);

        if (imagePart && imagePart.inlineData) {
            return NextResponse.json({
                image: `data:image/png;base64,${imagePart.inlineData.data}`,
                text: "Image generated successfully via Vertex AI."
            });
        }

        // Fallback to text if No image part but text exists
        const textResponse = result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;

        if (textResponse) {
            return NextResponse.json({ text: textResponse });
        }

        return NextResponse.json({ error: "No content returned from Vertex AI" }, { status: 500 });

    } catch (error: any) {
        console.error('Vertex AI Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
