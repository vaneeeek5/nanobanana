import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

// Helper to get access token using Service Account JSON
async function getAccessToken(credentials: any) {
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
        const { prompt, mode, image, startFrame, endFrame } = body;

        let credentials;
        if (process.env.VERTEX_CREDENTIALS) {
            try {
                credentials = JSON.parse(process.env.VERTEX_CREDENTIALS);
            } catch (e) {
                console.error("Failed to parse VERTEX_CREDENTIALS", e);
                return NextResponse.json({ error: "Server configuration error (Credentials)" }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: "VERTEX_CREDENTIALS missing" }, { status: 500 });
        }

        const projectId = credentials.project_id;
        // Veo 3 is likely in US-Central1 (Preview)
        const location = 'us-central1';
        // ID from UI Screenshot
        const modelId = 'veo-3.1-generate-preview';

        // 1. Get Access Token
        const accessToken = await getAccessToken(credentials);
        if (!accessToken) throw new Error("Failed to generate access token");

        // 2. Prepare Request for predictLongRunning
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning`;

        let instances: any[] = [];
        const instance: any = {};

        if (prompt) instance.prompt = prompt;

        if (mode === 'image' && image) {
            const base64 = image.includes('base64,') ? image.split('base64,')[1] : image;
            instance.image = { bytesBase64Encoded: base64 };
        }
        else if (mode === 'interpolation' && startFrame && endFrame) {
            const startBase64 = startFrame.includes('base64,') ? startFrame.split('base64,')[1] : startFrame;
            const endBase64 = endFrame.includes('base64,') ? endFrame.split('base64,')[1] : endFrame;
            instance.image = { bytesBase64Encoded: startBase64 };
            // Note: Interpolation schema for Veo 2 might differ, using img2vid style for now as fallback
        }

        instances.push(instance);

        const requestBody = {
            instances,
            parameters: {
                sampleCount: 1
            }
        };

        // 3. Start Long Running Operation
        console.log(`[Veo-Vertex] Starting LRO on ${modelId} in ${location}...`);
        const lroRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!lroRes.ok) {
            const errorText = await lroRes.text();
            console.error('[Veo API] LRO Start Fail:', errorText);

            // Specific error handling
            if (lroRes.status === 404) {
                return NextResponse.json({ error: `Model ${modelId} not found in ${location}. Your project might not have access to Veo.` }, { status: 404 });
            }

            throw new Error(`Veo API Error: ${lroRes.status} ${lroRes.statusText} - ${errorText}`);
        }

        const lroData = await lroRes.json();
        const operationName = lroData.name;
        console.log(`[Veo] Operation started: ${operationName}`);

        // 4. Poll for Completion (up to 40s)
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const pollRes = await fetch(`https://${location}-aiplatform.googleapis.com/v1beta1/${operationName}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const pollData = await pollRes.json();

            if (pollData.done) {
                if (pollData.error) {
                    throw new Error(`Veo Generation Failed: ${pollData.error.message}`);
                }

                // Veo success
                console.log('[Veo] Operation done');
                // For now returning a success message as we receive a GCS URI usually which needs a different flow to display.
                // We will return the raw response to see if we can extract videoUri

                // Try to extract
                const videoUri = pollData.response?.videoUri || pollData.response?.predictions?.[0]?.video?.uri;

                return NextResponse.json({
                    videoUrl: videoUri || "Video generated (Check output)",
                    raw: pollData
                });
            }
        }

        return NextResponse.json({ error: "Operation timed out (generating in background)." }, { status: 504 });

    } catch (error: any) {
        console.error('[Veo API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
