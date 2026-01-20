#!/bin/bash

# Script to update API URLs for production deployment

echo "🔄 Updating API URLs for production..."

# Frontend API URL update
if [ -z "$1" ]; then
    echo "Usage: $0 <backend-url>"
    echo "Example: $0 https://my-flask-app.herokuapp.com"
    exit 1
fi

BACKEND_URL=$1

# Update API calls in React components
find src -name "*.jsx" -o -name "*.js" | xargs sed -i "s|http://localhost:5000|$BACKEND_URL|g"

echo "✅ API URLs updated to: $BACKEND_URL"
echo "📝 Don't forget to commit these changes!"