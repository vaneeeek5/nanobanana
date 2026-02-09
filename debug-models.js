console.log("Script starting execution...");
const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function listModels(location) {
    console.log(`\n--- Checking Models in ${location} ---`);
    console.log("VERTEX_CREDENTIALS present:", !!process.env.VERTEX_CREDENTIALS);

    let googleAuthOptions;
    let projectId = 'tilda-3-485901';

    if (process.env.VERTEX_CREDENTIALS) {
        try {
            const credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
            googleAuthOptions = { credentials };
            projectId = credentials.project_id || projectId;
        } catch (e) {
            console.error("Creds parse error", e);
        }
    }

    const vertexAI = new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: googleAuthOptions
    });

    const candidates = [
        'imagen-3.0-generate-001',
        'imagen-3.0-fast-generate-001',
        'gemini-2.5-flash-image', // The one that worked!
        'gemini-3-pro-image-preview',
        'nano-banana-pro-preview',
        'veo-2.0-generate-001',
        'veo-3.1-generate-preview'
    ];

    for (const modelId of candidates) {
        process.stdout.write(`Testing: ${modelId}... `);
        try {
            const model = vertexAI.getGenerativeModel({ model: modelId });

            // Sync check for images
            if (!modelId.includes('veo')) {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: "test" }] }]
                });
                console.log("✅ AVAILABLE");
            } else {
                // For Veo, just instantiating might not fail until we call a method.
                // But in Vertex SDK, getGenerativeModel matches against known locations sometimes.
                console.log("❓ (Assume LRO needed)");
            }
        } catch (e) {
            if (e.message.includes('404') || e.message.includes('not found')) {
                console.log("❌ NOT FOUND");
            } else if (e.message.includes('429')) {
                console.log("⚠️  QUOTA (Exists)");
            } else {
                console.log(`❌ ERROR: ${e.message.substring(0, 50)}...`);
            }
        }
    }
}

async function run() {
    try {
        await listModels('europe-west1');
        await listModels('us-central1');
    } catch (e) {
        console.error("FATAL RUN ERROR:", e);
    }
}

run();
