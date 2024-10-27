#!/bin/bash

# Check if a commit message is provided
if [ -z "$1" ]; then
    echo "🚫 Error: Commit message is required."
    echo "💡 Usage: npm run deploy -- \"Your commit message\""
    exit 1
fi

echo "🔍 Staging changes with git add..."
git add .

echo "📝 Committing changes with message: '$1'"
git commit -m "$1"

echo "🚀 Pushing changes to remote repository..."
git push

echo "📦 Syncing files to the server (excluding node_modules and .git)..."
rsync -avz --exclude 'node_modules' --exclude '.git' \
    -e "ssh -i ~/.ssh/eldrige-macbook-pro.pem" \
    . ubuntu@16.171.151.245:~/app

echo "✅ Deployment complete! 🎉"
