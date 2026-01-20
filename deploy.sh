#!/bin/bash

# Deployment Script for FYP Project
# Usage: ./deploy.sh [platform]
# Platforms: vercel, railway, render, heroku

PLATFORM=${1:-vercel}

echo "🚀 Starting deployment for platform: $PLATFORM"

# Frontend deployment
if [ "$PLATFORM" = "vercel" ]; then
    echo "📦 Deploying frontend to Vercel..."
    cd frontend-build
    vercel --prod
    cd ..
elif [ "$PLATFORM" = "netlify" ]; then
    echo "📦 Deploying frontend to Netlify..."
    netlify deploy --prod --dir=dist
fi

# Backend deployment
if [ "$PLATFORM" = "railway" ]; then
    echo "🐍 Deploying backend to Railway..."
    cd backend
    railway deploy
    cd ..
elif [ "$PLATFORM" = "render" ]; then
    echo "🐍 Deploying backend to Render..."
    # Use Render CLI or push to GitHub for auto-deployment
    echo "Push to GitHub and connect to Render for auto-deployment"
elif [ "$PLATFORM" = "heroku" ]; then
    echo "🐍 Deploying backend to Heroku..."
    cd backend
    heroku create your-app-name
    git push heroku main
    cd ..
fi

echo "✅ Deployment complete!"
echo "Don't forget to update your frontend API URLs to point to the deployed backend!"