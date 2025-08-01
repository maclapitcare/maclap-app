# MacLap App - GitHub Pages Deployment Guide

## Overview
This guide will help you deploy your MacLap business app to GitHub Pages for completely free hosting.

## What We're Converting
- Remove Express.js server (not needed for GitHub Pages)
- Keep all Firebase functionality 
- Configure for static hosting
- Add GitHub Actions for automatic deployment

## Files Modified
1. `vite.config.ts` - Updated for GitHub Pages
2. `package.json` - Added GitHub Pages build scripts
3. `.github/workflows/deploy.yml` - Auto-deployment workflow
4. Updated base path for GitHub Pages

## Steps to Deploy
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Choose "GitHub Actions" as source
4. Your app will auto-deploy on every push

## Environment Variables Needed
You'll need to add these as GitHub repository secrets:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN` 
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Benefits
- ✅ Completely free forever
- ✅ All features work exactly the same
- ✅ Automatic deployments
- ✅ Custom domain support
- ✅ HTTPS included
- ✅ Fast global CDN