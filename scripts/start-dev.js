#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Start webpack dev server
console.log('Starting webpack dev server...');
const webpackProcess = spawn('npx', ['webpack', 'serve', '--mode', 'development'], {
  stdio: 'inherit',
  shell: true
});

// Wait for webpack to start before launching Electron
console.log('Waiting for webpack to start...');
setTimeout(() => {
  console.log('Starting Electron...');
  const electronProcess = spawn('cross-env', ['NODE_ENV=development', 'electron', '.'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle electron process exit
  electronProcess.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    webpackProcess.kill(); // Kill webpack when electron exits
    process.exit(code);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    electronProcess.kill();
    webpackProcess.kill();
    process.exit(0);
  });
}, 5000); // 5 second delay

// Handle webpack process exit
webpackProcess.on('close', (code) => {
  console.log(`Webpack process exited with code ${code}`);
  process.exit(code);
}); 