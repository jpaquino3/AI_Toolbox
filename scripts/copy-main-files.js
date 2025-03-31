const fs = require('fs');
const path = require('path');

console.log('Copying main process files to build directory...');

// Create build directory if it doesn't exist
const buildDir = path.resolve(__dirname, '../build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// List of files to copy
const filesToCopy = [
  'main.js',
  'preload.js',
  'package.json'
];

// Copy each file
filesToCopy.forEach(file => {
  const sourcePath = path.resolve(__dirname, '..', file);
  const destPath = path.resolve(buildDir, file);
  
  try {
    // Check if source file exists
    if (fs.existsSync(sourcePath)) {
      // Read and write the file content
      const content = fs.readFileSync(sourcePath);
      fs.writeFileSync(destPath, content);
      console.log(`✓ Copied ${file} to build directory`);
    } else {
      console.error(`✗ Source file not found: ${sourcePath}`);
    }
  } catch (error) {
    console.error(`✗ Error copying ${file}: ${error.message}`);
  }
});

console.log('Main process files copied successfully.'); 