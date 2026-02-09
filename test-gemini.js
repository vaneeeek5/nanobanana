const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGemini() {
    console.log("Testing Gemini API with Key: " + (process.env.GOOGLE_API_KEY ? "FOUND" : "MISSING"));

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    console.log("Script starting...");

    // 1. Test Image Gen (Gemini 2.5 Flash Image)
    try {
        console.log("\n--- Testing Gemini 2.5 Flash Image ---");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
        const result = await model.generateContent("Create an image of a futuristic neon city");
        console.log("Gemini 2.5 Response:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Gemini 2.5 Flash Image Error:", e.message);
    }

    // 2. Test Veo (Video) via Gemini API
    try {
        console.log("\n--- Testing Veo 3.1 via Gemini API ---");
        const veoModel = genAI.getGenerativeModel({ model: "veo-3.1-generate-preview" });

        const result = await veoModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: "A cinematic drone shot of a beach at sunset" }] }]
        });
        console.log("Veo Response:", JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("Veo via SDK Error:", e.message);
    }
}

testGemini().catch(e => console.error("FATAL SCRIPT ERROR:", e));
