import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { prompt, modelId } = await req.json();
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        let modelName = modelId || 'gemini-3-pro-image-preview';
        let model = genAI.getGenerativeModel({ model: modelName });

        try {
            console.log(`Attempting to generate with ${modelName}...`);
            const result = await model.generateContent(prompt || "Generate a hyper-realistic infographic of a gourmet cheeseburger, deconstructed");
            const response = await result.response;

            // Check for image parts in the response (experimental/preview models)
            const candidates = response.candidates;
            if (candidates && candidates.length > 0) {
                const parts = candidates[0].content?.parts;
                const imagePart = parts?.find(p => p.inlineData);
                if (imagePart) {
                    return NextResponse.json({
                        image: `data:${imagePart.inlineData?.mimeType};base64,${imagePart.inlineData?.data}`,
                        text: response.text()
                    });
                }
            }

            const text = response.text();
            return NextResponse.json({ text });
        } catch (primaryError: any) {
            console.warn(`Primary model ${modelName} failed:`, primaryError.message);

            // If primary fails (404 Not Found or 429), try stable fallback
            const fallbackModelId = 'gemini-2.0-flash';
            if (modelName !== fallbackModelId) {
                console.log(`Falling back to ${fallbackModelId}...`);
                const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelId });
                const fallbackResult = await fallbackModel.generateContent(prompt);
                const fallbackResponse = await fallbackResult.response;
                const text = fallbackResponse.text();
                return NextResponse.json({
                    text,
                    note: `Original model (${modelName}) was hit by quota or error, used fallback (${fallbackModelId}).`
                });
            }
            throw primaryError;
        }

    } catch (error: any) {
        console.error('Gemini API Error:', error);

        // Handle 429 specifically if SDK throws it with a status property
        // The SDK might throw a GoogleGenerativeAIResponseError
        if (error.message?.includes('429') || error.status === 429) {
            return NextResponse.json({
                error: {
                    code: 429,
                    message: "Quota exceeded (429). Please wait a moment and try again."
                }
            }, { status: 429 });
        }

        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
