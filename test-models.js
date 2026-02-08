const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    try {
        let credentials;
        if (process.env.VERTEX_CREDENTIALS) {
            credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
        } else {
            console.error('VERTEX_CREDENTIALS not found in env');
            return;
        }

        const project = credentials.project_id;
        const location = 'us-central1';

        console.log(`Checking models for project: ${project} in ${location}`);

        const vertexAI = new VertexAI({
            project: project,
            location: location,
            googleAuthOptions: { credentials }
        });

        // Vertex AI SDK doesn't have a direct "listModels" for GenerativeModel class in the same way.
        // We often just test if a model works.
        // But we can try to instantiate 'veo-001' and 'veo-2.0-generate-001' and see if they throw immediately?
        // Actually, the best way verification is the error message itself which we already have. 
        // "Publisher Model ... veo-001 ... not found"

        console.log("Testing Veo-001 access...");
        const veo = vertexAI.getGenerativeModel({ model: 'veo-001' });
        try {
            await veo.generateContent({ contents: [{ role: 'user', parts: [{ text: 'test' }] }] });
            console.log("Veo-001: SUCCESS");
        } catch (e) {
            console.log("Veo-001: FAILED - " + e.message);
        }

        console.log("Testing imagen-3.0-generate-001 access...");
        const imagen = vertexAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
        try {
            await imagen.generateContent({ contents: [{ role: 'user', parts: [{ text: 'test' }] }] });
            console.log("Imagen-3.0: SUCCESS");
        } catch (e) {
            // It might fail on 'test' prompt for safety or generation, but unrelated to 404
            console.log("Imagen-3.0: RESULT - " + e.message);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
