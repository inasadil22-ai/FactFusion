#!/bin/bash

# Script to update API URLs for production deployment Safely
set -e # Kisi bhi error par script ko rok dega

echo "🔄 Updating API URLs for production..."

# Check if backend URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Backend URL is missing."
    echo "Usage:   $0 <backend-url>"
    echo "Example: $0 https://inasadil22-ai-factfusion.hf.space"
    exit 1
fi

# Trailing slash ko remove karna (takay URLs double // na banayein code mein)
BACKEND_URL="${1%/}"

echo "📍 Target Backend URL: $BACKEND_URL"

# OS specific sed handling (macOS vs Linux fix)
sedi() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i "" "$@"
    else
        sed -i "$@"
    fi
}

echo "📝 Scanning and updating files in src/..."

# Safe find & update for both localhost:8080 and 127.0.0.1:8080
find src -type f \( -name "*.jsx" -o -name "*.js" -o -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
    if [ -f "$file" ]; then
        # Localhost strings ko safe URL se replace karega
        sedi "s|http://localhost:8080|$BACKEND_URL|g" "$file"
        sedi "s|http://127.0.0.1:8080|$BACKEND_URL|g" "$file"
    fi
done

echo "✅ API URLs successfully updated to: $BACKEND_URL"
echo "💡 Quick Tip: Run 'git diff' to verify the changes before committing!"