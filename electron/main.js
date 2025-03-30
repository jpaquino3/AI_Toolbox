const fs = require('fs');
const path = require('path');
const { ipcMain, dialog } = require('electron');

// Handle directory reading
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    const result = await Promise.all(
      files
        .filter(file => file.isFile())
        .map(async (file) => {
          const filePath = path.join(dirPath, file.name);
          const stats = await fs.promises.stat(filePath);
          
          return {
            name: file.name,
            path: filePath,
            size: stats.size,
            isDirectory: false,
            lastModified: stats.mtime
          };
        })
    );
    
    return { files: result };
  } catch (error) {
    console.error('Error reading directory:', error);
    return { error: error.message };
  }
});

// Handle file reading
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return { data: data.toString('base64') };
  } catch (error) {
    console.error('Error reading file:', error);
    return { error: error.message };
  }
});

// Handle dialog for selecting directories
ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    return await dialog.showOpenDialog(options);
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return { error: error.message, canceled: true };
  }
});

// In the app.whenReady() section, add preload setup
app.whenReady().then(() => {
  // ... existing code ...
  
  // Add this to expose the Electron API to the renderer process
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.electron = {
        readDirectory: (dirPath) => window.ipcRenderer.invoke('read-directory', dirPath),
        readFile: (filePath) => window.ipcRenderer.invoke('read-file', filePath),
        showOpenDialog: (options) => window.ipcRenderer.invoke('show-open-dialog', options)
      };
    `);
  });
  
  // ... existing code ...
});

// ... rest of existing code ...

// Find the createWindow function or where the BrowserWindow is created
function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Make sure this line exists
      webviewTag: true,
      webSecurity: false
    }
  });

  // ... existing code ...
}

// ... rest of existing code ... 