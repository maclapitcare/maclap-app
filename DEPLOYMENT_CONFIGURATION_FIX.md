# Deployment Configuration Fix - Manual Steps Required

## Problem
Your deployment fails because the `.replit` file is set to `static` but this Express.js app needs `autoscale` deployment.

## Fix Required
Since I cannot edit the `.replit` file directly, you need to make this change manually:

**Open your `.replit` file and update the `[deployment]` section:**

**Change from:**
```
[deployment]
deploymentTarget = "static"
build = ["node", "build.js"]
publicDir = "dist"
```

**Change to:**
```
[deployment]
deploymentTarget = "autoscale"
build = ["node", "build.js"]
run = ["npm", "start"]
```

## What Changes:
1. `deploymentTarget = "autoscale"` - Runs your Express server
2. Remove `publicDir = "dist"` - Not needed for server deployment  
3. Add `run = ["npm", "start"]` - Starts production server

## Why This Works:
- Static deployment only serves files, can't handle server routes
- Autoscale deployment runs your Express.js server properly
- Server handles SPA routing so page refreshes work on all tabs
- The `npm start` script is already configured in package.json

After making this change, your deployment will work correctly.