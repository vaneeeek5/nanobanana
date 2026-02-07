#!/bin/bash

# setup_deploy.sh - Automation for GitHub & Cloud Run

echo "🚀 Starting Deployment Setup..."

# 1. Initialize Git if not already done
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "chore: initial commit for deployment"
    echo "✅ Git repository initialized."
fi

# 2. Add .gitignore if missing
if [ ! -f ".gitignore" ]; then
    echo "node_modules
.next
.env*
*.local
out
build" > .gitignore
    echo "✅ .gitignore created."
fi

# 3. Check for GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found. Please install it with: brew install gh"
else
    echo "✅ GitHub CLI found. Creating repository..."
    gh repo create gemini-studio-app --public --source=. --remote=origin --push
fi

# 4. Check for Google Cloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  Google Cloud SDK (gcloud) not found. Please install it from: https://cloud.google.com/sdk"
else
    echo "✅ GCloud found. Enabling necessary services..."
    gcloud services enable run.googleapis.com cloudbuild.googleapis.com
    
    echo "🛠 Submitting build to Google Cloud..."
    gcloud builds submit --config cloudbuild.yaml .
fi

echo "🏁 Setup script finished. If gh/gcloud were missing, please install them and run this again."
