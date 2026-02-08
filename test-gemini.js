const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGemini() {
    console.log("Testing Gemini API with Key: " + (process.env.GOOGLE_API_KEY ? "FOUND" : "MISSING"));

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    // 1. Test Image Gen (Gemini 2.0 Flash)
    // Note: Image generation in Gemini API is usually model.generateContent with specific prose, 
    // BUT 'imagen-3.0-generate-001' effectively isn't in GenAI SDK directly, 
    // however, Gemini 2.0 Flash *can* generate images multimodally in some previews.
    // Let's try the standard text-to-image prompt.
    try {
        console.log("\n--- Testing Gemini 2.0 Flash Image Gen ---");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent("Create an image of a futuristic neon city");
        console.log("Gemini 2.0 Flash Response:", result.response.text());
        // If it returns text describing the image, then it didn't generate an image. 
        // True image gen via Gemini API usually returns inlineData or similar if configured.
    } catch (e) {
        console.error("Gemini 2.0 Flash Error:", e.message);
    }

    // 2. Test Veo (Video) via Gemini API
    // The user claims Veo is available. Standard SDK might not support it yet, 
    // so we might need to use the REST endpoint manually if the SDK throws "model not found".
    try {
        console.log("\n--- Testing Veo 2.0 via Gemini API ---");
        // Attempting to access the model directly via SDK
        const veoModel = genAI.getGenerativeModel({ model: "veo-2.0-generate-001" });
        // Or "veo-3.0-generate-preview"
        // Note: SDK might support it if the backend does.

        // Veo params are usually specific.
        const result = await veoModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: "A cinematic drone shot of a beach at sunset" }] }]
        });
        console.log("Veo Response:", JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("Veo via SDK Error:", e.message);

        // Fallback: Try REST API directly to generativelanguage.googleapis.com
        console.log("...Attempting raw REST to generativelanguage...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:generateContent?key=${process.env.GOOGLE_API_KEY}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "A cinematic drone shot of a beach at sunset" }] }]
                })
            });
            const data = await res.json();
            if (data.error) console.error("REST Veo Error:", data.error);
            else console.log("REST Veo Success:", JSON.stringify(data).substring(0, 200) + "...");
        } catch (err) {
            console.error("REST Fetch Error:", err.message);
        }
    }
}

testGemini();
