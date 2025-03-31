#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

// Start webpack dev server
console.log('Starting webpack dev server...');
const webpackProcess = spawn('npx', ['webpack', 'serve', '--mode', 'development'], {
  stdio: 'inherit',
  shell: true
});

// Function to check if webpack server is ready
function checkWebpackServer() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      http.get('http://localhost:3001', (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkInterval);
          console.log('Webpack server is ready!');
          resolve();
        }
      }).on('error', (err) => {
        console.log('Waiting for webpack server...');
      });
    }, 1000);
  });
}

// Start Electron only after webpack is ready
async function startElectron() {
  try {
    await checkWebpackServer();
    
    console.log('Starting Electron...');
    const electronProcess = spawn('electron', ['.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development', FORCE_COLOR: '1' }
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
  } catch (error) {
    console.error('Error starting Electron:', error);
    webpackProcess.kill();
    process.exit(1);
  }
}

// Handle webpack process exit
webpackProcess.on('close', (code) => {
  console.log(`Webpack process exited with code ${code}`);
  process.exit(code);
});

// Start the application
startElectron(); 