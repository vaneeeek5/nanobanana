import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

// Helper for Vertex LRO
async function getVertexAccessToken(credentials: any) {
    const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, backendSource } = body; // 'vertex' | 'studio'

        console.log(`[Veo] Request: Source=${backendSource}`);

        // --- VERTEX AI (Veo 2.0 LRO) ---
        if (backendSource === 'vertex') {
            console.log("[Veo-Vertex] Starting LRO...");

            if (!process.env.VERTEX_CREDENTIALS) {
                return NextResponse.json({ error: "VERTEX_CREDENTIALS missing" }, { status: 500 });
            }
            const credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
            const projectId = credentials.project_id;
            const location = 'us-central1';
            const modelId = 'veo-2.0-generate-001'; // Vertex stable

            const accessToken = await getVertexAccessToken(credentials);
            const endpoint = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning`;

            const requestBody = {
                instances: [{ prompt }],
                parameters: { sampleCount: 1 }
            };

            const lroRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!lroRes.ok) {
                const txt = await lroRes.text();
                return NextResponse.json({ error: `Vertex Error: ${lroRes.status} - ${txt}` }, { status: 500 });
            }

            const lroData = await lroRes.json();
            const operationName = lroData.name;

            // Poll briefly (user expects it might take time, but we poll a bit here or return LRO ID)
            // Simplified: Poll for 10s then return "Check console" or explicit wait
            // For now, let's just return the fact it started or wait loop

            // 3. Poll for Completion (simplified loop)
            const maxAttempts = 15;
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const pollRes = await fetch(`https://${location}-aiplatform.googleapis.com/v1beta1/${operationName}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const pollData = await pollRes.json();

                if (pollData.done) {
                    if (pollData.error) throw new Error(pollData.error.message);
                    const videoUri = pollData.response?.videoUri || pollData.response?.predictions?.[0]?.video?.uri;
                    return NextResponse.json({ videoUrl: videoUri });
                }
            }
            return NextResponse.json({ error: "Vertex LRO Timeout (check logs)" }, { status: 504 });
        }

        // --- AI STUDIO (Veo 3.1 REST) ---
        else {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) return NextResponse.json({ error: "GOOGLE_API_KEY missing" }, { status: 500 });

            console.log("[Veo-Studio] Using REST API...");
            // Model: veo-3.1-generate-preview
            const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json({ error: `AI Studio Error: ${response.status} - ${errText}` }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

    } catch (error: any) {
        console.error('[Veo API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
