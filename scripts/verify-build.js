const fs = require('fs');
const path = require('path');

console.log('Verifying build contents...');

const buildDir = path.resolve(__dirname, '../build');

// List of critical files that must be present
const requiredFiles = [
  'main.js',
  'preload.js',
  'package.json',
  'index.html',
  'bundle.js'
];

// Check each required file
let allFilesPresent = true;
requiredFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} is present`);
    
    // Additional check for main.js and preload.js to ensure they contain updater code
    if (file === 'main.js' || file === 'preload.js') {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if main.js contains the auto-updater code
      if (file === 'main.js' && !content.includes('autoUpdater')) {
        console.error(`⚠ ${file} does not contain auto-updater code!`);
        allFilesPresent = false;
      }
      
      // Check if preload.js contains update-related functions
      if (file === 'preload.js' && !content.includes('checkForUpdates')) {
        console.error(`⚠ ${file} does not contain update-related functions!`);
        allFilesPresent = false;
      }
    }
  } else {
    console.error(`✗ ${file} is missing!`);
    allFilesPresent = false;
  }
});

// Check if electron-updater is in dependencies
const packageJsonPath = path.join(buildDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.dependencies || !packageJson.dependencies['electron-updater']) {
    console.error('⚠ electron-updater is not in package.json dependencies!');
    allFilesPresent = false;
  }
}

if (allFilesPresent) {
  console.log('✅ Build verification successful! All required files are present.');
} else {
  console.error('❌ Build verification failed! Some required files are missing or incomplete.');
}

console.log('\nBuild Directory Contents:');
const listFiles = (dir, indent = '') => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`${indent}📁 ${file}/`);
      listFiles(filePath, indent + '  ');
    } else {
      console.log(`${indent}📄 ${file}`);
    }
  });
};

listFiles(buildDir); 