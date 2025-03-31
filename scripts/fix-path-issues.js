const fs = require('fs');
const path = require('path');

console.log('Fixing path issues in built files...');

const buildDir = path.resolve(__dirname, '../build');
const mainJsPath = path.join(buildDir, 'main.js');
const preloadJsPath = path.join(buildDir, 'preload.js');

// Function to fix paths with spaces in a file
function fixPathsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix paths with spaces - add quotes around paths if needed
  // This is a simple fix that catches some common path patterns
  const pathRegexes = [
    /require\(([^'"]+)\)/g,  // require calls without quotes
    /path\.join\(([^)]+)\)/g,  // path.join calls
    /path\.resolve\(([^)]+)\)/g,  // path.resolve calls
    /fs\.readFileSync\(([^,]+),/g,  // fs.readFileSync calls
    /fs\.writeFileSync\(([^,]+),/g,  // fs.writeFileSync calls
  ];
  
  pathRegexes.forEach(regex => {
    content = content.replace(regex, (match, p1) => {
      // Only modify if it doesn't already have quotes and might have spaces
      if (!p1.includes('"') && !p1.includes("'") && (p1.includes(' ') || p1.includes('__dirname'))) {
        return match.replace(p1, `"${p1.trim()}"`);
      }
      return match;
    });
  });
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed paths in ${path.basename(filePath)}`);
}

// Fix main.js and preload.js
fixPathsInFile(mainJsPath);
fixPathsInFile(preloadJsPath);

console.log('Path issues fixed successfully!'); 