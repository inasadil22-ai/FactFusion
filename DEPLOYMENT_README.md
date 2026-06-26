# 🚀 Production Deployment Guide

## Overview
This guide covers deploying your React + Flask + MongoDB application to production.

## 📋 Prerequisites
- MongoDB Atlas account (for database)
- GitHub account (for deployment)
- Node.js and Python installed locally

## 🗄️ Database Setup (MongoDB Atlas)
1. Create account at https://cloud.mongodb.com
2. Create a free cluster
3. Get connection string from "Connect" → "Connect your application"
4. Update `backend/.env.production` with your MongoDB URI

## 🎯 Deployment Options

### Option 1: Vercel + Railway (Recommended)
**Frontend:** Vercel (Free) | **Backend:** Railway (Free tier available)

#### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Update API URLs in production
# Change localhost:5000 to your Railway backend URL
```

#### Backend Deployment (Railway)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy
```

### Option 2: Heroku (Full-stack)
**Both frontend and backend on Heroku**

```bash
# Backend deployment
cd backend
heroku create your-backend-name
git push heroku main

# Frontend deployment
cd ..
heroku create your-frontend-name --buildpack mars/create-react-app
git push heroku main
```

### Option 3: Docker Deployment
**Containerized deployment**

```bash
# Build and run locally
docker-compose up --build

# Deploy to cloud platforms like:
# - Google Cloud Run
# - AWS ECS
# - DigitalOcean App Platform
```

## 🔧 Configuration Files Created

### Backend
- `requirements.txt` - Python dependencies
- `Procfile` - Heroku process file
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Local container setup
- `.env.production` - Production environment variables

### Frontend
- `vercel.json` - Vercel deployment configuration

## 🌐 Environment Variables

### Backend (.env.production)
```env
MONGO_URI=your-mongodb-atlas-connection-string
SECRET_KEY=your-secure-random-string
FLASK_ENV=production
```

### Frontend
Update API base URLs in your React app:
```javascript
// Change from:
const API_BASE = 'http://localhost:5000/api';

// To:
const API_BASE = 'https://your-backend-url.com/api';
```

## 🚀 Quick Deployment Script

Run the automated deployment script:
```bash
chmod +x deploy.sh
./deploy.sh vercel    # For Vercel + Railway
./deploy.sh heroku    # For Heroku
```

## 📊 Cost Comparison

| Platform | Frontend | Backend | Database | Total/Month |
|----------|----------|---------|----------|-------------|
| Vercel + Railway | Free | $5 | Free | ~$5 |
| Heroku | $7 | $7 | Free | ~$14 |
| Render | $7 | $7 | Free | ~$14 |
| Netlify + Railway | Free | $5 | Free | ~$5 |

## 🔍 Post-Deployment Checklist

- [ ] Update all API URLs in frontend
- [ ] Test user registration and login
- [ ] Verify file uploads work
- [ ] Check admin dashboard functionality
- [ ] Test MongoDB connections
- [ ] Verify CORS is working
- [ ] Test on mobile devices

## 🆘 Troubleshooting

### CORS Issues
Update `server.py` CORS origins to include your production domain:
```python
CORS(app, origins=["https://your-frontend-domain.com"])
```

### Environment Variables
Ensure all required environment variables are set in your deployment platform.

### Database Connection
Test MongoDB Atlas connection locally before deploying:
```bash
python -c "from pymongo import MongoClient; client = MongoClient('your-uri'); print('Connected!')"
```

## 📞 Support

For deployment issues, check:
- Platform-specific documentation
- MongoDB Atlas connection guides
- Flask deployment tutorials

Happy deploying! 🎉