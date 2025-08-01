#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to run command and return promise
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const process = spawn(command, args, { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

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

async function build() {
  try {
    console.log('Starting build process...');
    
    // Step 1: Run Vite build
    await runCommand('npx', ['vite', 'build']);
    
    // Step 2: Run esbuild for server
    await runCommand('npx', ['esbuild', 'server/index.ts', '--platform=node', '--packages=external', '--bundle', '--format=esm', '--outdir=dist']);
    
    // Step 3: Move files from dist/public to dist
    const distPublicPath = path.join(__dirname, 'dist', 'public');
    const distPath = path.join(__dirname, 'dist');
    
    console.log('Moving files from dist/public to dist...');
    
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
      
      console.log('Successfully moved files to dist directory');
    } else {
      console.log('No dist/public directory found');
    }
    
    console.log('Build completed successfully!');
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();