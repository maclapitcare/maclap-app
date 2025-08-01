# Deployment Configuration Fix

## Problem
The app is currently deployed as "static" but needs to run as a server application to handle SPA routing properly.

## Solution
You need to manually update the `.replit` file to change the deployment configuration:

### Current Configuration (causing 404 errors):
```
[deployment]
deploymentTarget = "static"
build = ["node", "build.js"]
publicDir = "dist"
```

### Required Configuration (fixes SPA routing):
```
[deployment]
deploymentTarget = "autoscale"
build = ["node", "build.js"]
run = ["npm", "start"]
```

## Steps to Fix:
1. Open the `.replit` file in your project
2. Find the `[deployment]` section
3. Change `deploymentTarget = "static"` to `deploymentTarget = "autoscale"`
4. Replace `publicDir = "dist"` with `run = ["npm", "start"]`
5. Save the file
6. Redeploy your app

## Why This Fixes the Issue:
- Static deployment serves files directly without server logic
- Autoscale deployment runs your Express.js server
- The server handles SPA routing fallback for all client-side routes
- This allows refreshing on /dashboard, /notes, /settings to work properly

After making this change and redeploying, all tabs will refresh correctly without 404 errors.