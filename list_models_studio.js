const fs = require('fs');

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyB_BUpoKqiT810wtkmTBm8PbIb6gatDElA";
    const logFile = 'available_models.txt';

    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        fs.writeFileSync(logFile, 'Starting model check...\n');
        log("Fetching models from v1beta...");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            log(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            log(`Response body: ${text}`);
            return;
        }

        const data = await response.json();

        if (data.models) {
            log("Available Models (v1beta):");
            data.models.forEach(m => {
                // Log the pure name (e.g. models/gemini-pro) AND the display name
                log(`ID: ${m.name} | Display: ${m.displayName}`);
            });
        } else {
            log("No models found in response:", JSON.stringify(data));
        }
    } catch (error) {
        log("Error: " + error.message);
    }
}

listModels();
