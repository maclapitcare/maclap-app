# Deployment Configuration Fix

## Required Changes to .replit File

You need to manually update your `.replit` file by changing the `[deployment]` section:

**Current (causing the error):**
```
[deployment]
deploymentTarget = "static"
build = ["npm", "run", "build"]
publicDir = "dist"
```

**Change to (fixes the issue):**
```
[deployment]
deploymentTarget = "autoscale"
build = ["node", "build.js"]
run = ["npm", "start"]
```

## Why These Changes Work

1. **autoscale**: Properly handles your Express.js server instead of serving static files
2. **node build.js**: Uses the custom build script that moves files to the correct location
3. **npm start**: Starts your production server (already configured in package.json)

## Steps to Fix

1. Open the `.replit` file in your editor
2. Replace the `[deployment]` section with the new configuration above
3. Save the file
4. Deploy your project

The build scripts are already properly configured and will handle the file organization automatically.