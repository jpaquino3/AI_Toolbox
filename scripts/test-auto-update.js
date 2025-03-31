#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Building production version...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('Build failed with code:', code);
    process.exit(code);
    return;
  }
  
  console.log('Build completed successfully. Starting app...');
  
  // Run Electron with special environment variables to test auto-update
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      // This will make the app act like it found an update without actually checking GitHub
      SIMULATE_UPDATE: 'true'
    }
  });
  
  electronProcess.on('close', (code) => {
    console.log(`App exited with code ${code}`);
    process.exit(code);
  });
}); 