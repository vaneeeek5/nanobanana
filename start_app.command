пришли #!/bin/bash
echo "Starting Gemini Studio App..."
cd /Users/ivan/.gemini/antigravity/scratch/gemini-studio-app
if [ ! -d "node_modules" ]; then
    echo "First run setup: Installing dependencies... (this may take a minute)"
    npm install
fi
npm run dev
