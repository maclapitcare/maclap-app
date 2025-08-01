import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Function to copy directory contents
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Function to remove directory
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

try {
  const distPublicPath = path.join(rootDir, 'dist', 'public');
  const distPath = path.join(rootDir, 'dist');
  
  console.log('Post-build: Moving files from dist/public to dist...');
  
  if (fs.existsSync(distPublicPath)) {
    // Copy all files from dist/public to dist
    const entries = fs.readdirSync(distPublicPath, { withFileTypes: true });
    
    for (let entry of entries) {
      const srcPath = path.join(distPublicPath, entry.name);
      const destPath = path.join(distPath, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    
    // Remove the public directory
    removeDir(distPublicPath);
    
    console.log('Post-build: Successfully moved files to dist directory');
  } else {
    console.log('Post-build: No dist/public directory found');
  }
} catch (error) {
  console.error('Post-build error:', error);
  process.exit(1);
}