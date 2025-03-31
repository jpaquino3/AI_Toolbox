const fs = require('fs');
const path = require('path');

console.log('Fixing Windows-specific build issues...');

// Handle special requirements for Windows builds
function prepareWindowsBuild() {
  try {
    // Fix paths in config file to use proper Windows path separators
    const buildDir = path.resolve(__dirname, '../build');
    const mainJsPath = path.join(buildDir, 'main.js');
    
    if (fs.existsSync(mainJsPath)) {
      let content = fs.readFileSync(mainJsPath, 'utf8');
      
      // Fix path separators in Windows
      content = content.replace(/path\.join\(([^)]+)\)/g, (match, p1) => {
        return `path.join(${p1.replace(/\//g, '\\\\')})`;
      });
      
      // Fix path.resolve calls too
      content = content.replace(/path\.resolve\(([^)]+)\)/g, (match, p1) => {
        return `path.resolve(${p1.replace(/\//g, '\\\\')})`;
      });
      
      // Add Windows-specific code for sqlite binary
      const sqliteBinaryCode = `
// Windows-specific code for finding sqlite binary
if (process.platform === 'win32' && !isDev) {
  try {
    const appPath = app.getAppPath();
    const isAsar = appPath.includes('app.asar');
    
    if (isAsar) {
      // Set the sqlite3 binary path to the unpacked location for Windows
      process.env.SQLITE3_BINARY_PATH = path.join(
        path.dirname(appPath),
        'app.asar.unpacked',
        'node_modules',
        'sqlite3',
        'build',
        'Release'
      );
      
      console.log('Set Windows SQLITE3_BINARY_PATH to:', process.env.SQLITE3_BINARY_PATH);
    }
  } catch (error) {
    console.error('Error setting up Windows sqlite3 paths:', error);
  }
}`;
      
      // Add the Windows-specific code after the first block of code for sqlite paths
      content = content.replace(
        /\/\/ Fix sqlite3 path issues[\s\S]*?}\s*}/,
        (match) => match + '\n\n' + sqliteBinaryCode
      );
      
      fs.writeFileSync(mainJsPath, content, 'utf8');
      console.log('✓ Windows-specific modifications added to main.js');
    } else {
      console.error('❌ Could not find main.js in build directory');
    }
    
    // Create a .ico format that's definitely compatible with electron-builder
    // (This is a backup if regular conversion didn't work properly)
    console.log('Ensuring icon is in correct format for Windows...');
    
    // We'll create a more compatible icon using multiple sizes
    // This is a more reliable approach than a single conversion
    const iconCommand = 'magick convert ai_icon.png -define icon:auto-resize=256,128,64,48,32,16 AppIcon.ico';
    require('child_process').execSync(iconCommand, { stdio: 'inherit' });
    
    console.log('✓ Windows icon created successfully');
    
  } catch (error) {
    console.error('Error preparing Windows build:', error);
  }
}

prepareWindowsBuild();

console.log('Windows build preparation completed!'); 