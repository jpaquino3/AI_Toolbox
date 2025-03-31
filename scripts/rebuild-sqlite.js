const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Rebuilding sqlite3 native module for Electron...');

// Determine the electron version
const electronVersion = require('../node_modules/electron/package.json').version;
console.log(`Detected Electron version: ${electronVersion}`);

// Command to rebuild sqlite3
const cmd = `npx electron-rebuild -f -w sqlite3 -v ${electronVersion}`;

console.log(`Running command: ${cmd}`);

// Execute the rebuild command
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error during rebuild: ${error.message}`);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log(stdout);
  console.log('Native module rebuild successful!');
  
  // Verify the rebuild was successful
  const platform = process.platform;
  const arch = process.arch;
  
  let binaryPath;
  if (platform === 'darwin') {
    binaryPath = path.resolve(__dirname, '../node_modules/sqlite3/lib/binding/electron-v' + 
      electronVersion.split('.')[0] + '-' + platform + '-' + arch + '/node_sqlite3.node');
  } else if (platform === 'win32') {
    binaryPath = path.resolve(__dirname, '../node_modules/sqlite3/lib/binding/electron-v' + 
      electronVersion.split('.')[0] + '-' + platform + '-' + arch + '/node_sqlite3.node');
  } else {
    binaryPath = path.resolve(__dirname, '../node_modules/sqlite3/lib/binding/electron-v' + 
      electronVersion.split('.')[0] + '-' + platform + '-' + arch + '/node_sqlite3.node');
  }
  
  if (fs.existsSync(binaryPath)) {
    console.log(`✅ Successfully built sqlite3 native module at: ${binaryPath}`);
  } else {
    console.error(`❌ Could not find built sqlite3 module at: ${binaryPath}`);
    console.log('Looking for alternatives...');
    
    // Try to find it in another location
    const nodeModulesPath = path.resolve(__dirname, '../node_modules/sqlite3');
    console.log(`Searching in ${nodeModulesPath}...`);
    
    function findNodeSqlite3(dir, depth = 0) {
      if (depth > 3) return null; // Limit recursion depth
      
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            const result = findNodeSqlite3(filePath, depth + 1);
            if (result) return result;
          } else if (file === 'node_sqlite3.node') {
            return filePath;
          }
        }
      } catch (err) {
        console.error(`Error searching directory ${dir}: ${err.message}`);
      }
      
      return null;
    }
    
    const foundPath = findNodeSqlite3(nodeModulesPath);
    if (foundPath) {
      console.log(`✅ Found sqlite3 native module at: ${foundPath}`);
    } else {
      console.error(`❌ Could not find sqlite3 native module anywhere in node_modules/sqlite3.`);
      console.log('Try rebuilding manually with: npx electron-rebuild -f -w sqlite3');
    }
  }
}); 