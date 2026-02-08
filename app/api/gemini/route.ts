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

            // Step 1 Fallback: try Gemini 1.5 Flash (often has best quotas)
            const fallback1 = 'gemini-1.5-flash';
            if (modelName !== fallback1) {
                try {
                    console.log(`Falling back to ${fallback1}...`);
                    const fb1Model = genAI.getGenerativeModel({ model: fallback1 });
                    const fb1Result = await fb1Model.generateContent(prompt);
                    const fb1Response = await fb1Result.response;
                    return NextResponse.json({
                        text: fb1Response.text(),
                        note: `Original model (${modelName}) hit quota/error. Successfully used ${fallback1}.`
                    });
                } catch (fb1Error: any) {
                    console.warn(`${fallback1} failed too:`, fb1Error.message);
                }
            }

            // Step 2 Fallback: try Gemini 2.0 Flash
            const fallback2 = 'gemini-2.0-flash';
            if (modelName !== fallback2 && fallback1 !== fallback2) {
                try {
                    console.log(`Falling back to ${fallback2}...`);
                    const fb2Model = genAI.getGenerativeModel({ model: fallback2 });
                    const fb2Result = await fb2Model.generateContent(prompt);
                    const fb2Response = await fb2Result.response;
                    return NextResponse.json({
                        text: fb2Response.text(),
                        note: `Multiple models failed, used ${fallback2} as final backup.`
                    });
                } catch (fb2Error: any) {
                    console.error('All fallbacks failed:', fb2Error.message);
                }
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
