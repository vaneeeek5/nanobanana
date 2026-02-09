const fs = require('fs');
const path = require('path');

console.log("Starting model lister...");

const envPath = path.resolve(__dirname, '.env.local');
let apiKey = '';

try {
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GOOGLE_API_KEY=(.*)/);
        if (match && match[1]) {
            apiKey = match[1].trim();
            console.log("Found API Key length:", apiKey.length);
        } else {
            console.log("GOOGLE_API_KEY not found in .env.local content");
        }
    } else {
        console.log(".env.local file not found at:", envPath);
    }
} catch (e) {
    console.error("Error reading .env.local:", e);
}

if (!apiKey) {
    // Fallback: Check process.env if loaded elsewhere (unlikely in standalone script without dotenv)
    if (process.env.GOOGLE_API_KEY) {
        apiKey = process.env.GOOGLE_API_KEY;
        console.log("Found API Key in process.env");
    } else {
        console.error("CRITICAL: No API Key found. Cannot list models.");
        process.exit(1);
    }
}

async function listModels() {
    console.log("Querying Gemini API...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.error(`API Request Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response body:", text);
            return;
        }

        const data = await response.json();

        if (!data.models) {
            console.log("No 'models' field in response:", JSON.stringify(data).substring(0, 200));
            return;
        }

        console.log("\n====== AVAILABLE MODELS ======");
        data.models.forEach(m => {
            if (m.name.includes('gemini') || m.name.includes('veo') || m.name.includes('imagen')) {
                console.log(`ID: ${m.name.replace('models/', '')}`);
                console.log(`   Disp: ${m.displayName}`);
                console.log(`   Vers: ${m.version}`);
                console.log('-----------------------------');
            }
        });
        console.log("==============================");

    } catch (e) {
        console.error("Fetch Execution Error:", e);
    }
}

listModels();
