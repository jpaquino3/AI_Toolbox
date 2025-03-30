const { app, BrowserWindow, ipcMain, dialog, globalShortcut, session } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');

// Keep a global reference of the window object
let mainWindow;
// Track registered shortcuts
let registeredShortcuts = [];
// Track app-level keybindings (these will override browser shortcuts)
let appKeybindings = {};

// At the beginning of file, add a comment to remind about the Info.plist update
// IMPORTANT: To fix the camera API deprecation warning, add NSCameraUseContinuityCameraDeviceType 
// to your Info.plist when packaging the app for production

function createWindow() {
  console.log('Creating window...');
  console.log('Development mode:', isDev);
  
  // Setup permissions for camera and microphone - use the newer API
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      // Always allow camera and microphone
      callback(true);
    } else {
      callback(false);
    }
  });

  // Create the browser window with improved options
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      // Enable hardware acceleration
      enableBlinkFeatures: 'MediaDevices',
      // For MacOS Continuity Camera support
      additionalArguments: ['--enable-features=UseOzonePlatform'],
    },
    titleBarStyle: 'hiddenInset', // For a cleaner look on macOS
    backgroundColor: '#f5f5f7', // Light background color
    show: false, // Don't show the window until it's ready
  });

  // Wait for the window to be ready before showing it
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Load the index.html of the app
  if (isDev) {
    // Add a slight delay to make sure webpack dev server is up
    console.log('Waiting for webpack server...');
    setTimeout(() => {
      console.log('Loading URL: http://localhost:3001');
      mainWindow.loadURL('http://localhost:3001');
      
      // Open the DevTools in development mode
      setTimeout(() => {
        mainWindow.webContents.openDevTools();
      }, 2000);
    }, 3000); // Increased delay to give webpack more time
  } else {
    const filePath = path.join(__dirname, 'build/index.html');
    console.log('Loading file:', filePath);
    mainWindow.loadFile(filePath);
  }

  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription, 'Code:', errorCode);
    // Try to reload after a delay
    setTimeout(() => {
      if (mainWindow) {
        console.log('Attempting to reload...');
        mainWindow.loadURL('http://localhost:3001');
      }
    }, 3000);
  });
  
  // Debug content
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
    
    // Inject some CSS to ensure basic styling works
    mainWindow.webContents.insertCSS(`
      body, html, #root {
        margin: 0;
        padding: 0;
        height: 100vh;
        width: 100vw;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      webview {
        display: inline-flex !important;
        width: 100% !important;
        height: 100% !important;
        flex: 1 !important;
      }
    `);
  });
  
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM ready');
  });

  // Monitor keyboard events in the webContents to override browser shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Only handle keyboard events with modifiers
    if (input.type === 'keyDown' && (input.control || input.meta || input.alt || input.shift)) {
      console.log('Electron captured keyboard input:', input);
      
      try {
        // Create normalized key for lookup
        const keyCombo = createKeyComboString(input);
        console.log('Normalized key combo:', keyCombo);
        console.log('Registered app keybindings:', Object.keys(appKeybindings));
        
        // Check if this matches any of our registered app keybindings
        if (appKeybindings[keyCombo]) {
          console.log('MATCH FOUND! OVERRIDING BROWSER for key combo:', keyCombo);
          
          // Stop browser from handling this event
          event.preventDefault();
          
          // Emit an event to the renderer so the app can handle this shortcut
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-keybinding-triggered', keyCombo);
          }
        } else {
          console.log('No matching keybinding found for:', keyCombo);
        }
      } catch (error) {
        console.error('Error handling keyboard event:', error);
      }
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });
}

// Helper to create a consistent key combo string
function createKeyComboString(input) {
  const parts = [];
  
  if (input.control) parts.push('Ctrl');
  if (input.alt) parts.push('Alt');
  if (input.shift) parts.push('Shift');
  if (input.meta) parts.push('Cmd');
  
  // Convert special keys to a normalized form
  let key = input.key;
  if (key === ' ') key = 'SPACE';
  else if (key === 'ArrowUp') key = 'UP';
  else if (key === 'ArrowDown') key = 'DOWN';
  else if (key === 'ArrowLeft') key = 'LEFT';
  else if (key === 'ArrowRight') key = 'RIGHT';
  else key = key.toUpperCase();
  
  parts.push(key);
  return parts.join('+');
}

// Create window when app is ready
app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
  
  // Setup IPC handlers
  setupIPC();
});

// Set up IPC communication
function setupIPC() {
  // Register a keyboard shortcut at the browser level
  ipcMain.on('register-shortcut', (event, shortcut) => {
    console.log(`Registering global shortcut: ${shortcut}`);
    
    try {
      const ret = globalShortcut.register(shortcut, () => {
        console.log(`Shortcut ${shortcut} triggered`);
        // Send to renderer process
        if (mainWindow) {
          mainWindow.webContents.send(`shortcut-${shortcut}`);
        }
      });
      
      if (!ret) {
        console.log(`Failed to register shortcut: ${shortcut}`);
      } else {
        registeredShortcuts.push(shortcut);
      }
    } catch (error) {
      console.error(`Error registering shortcut ${shortcut}:`, error);
    }
  });
  
  // Register app-level keybindings that override browser shortcuts
  ipcMain.on('register-app-keybinding', (event, keybinding) => {
    console.log(`Registering app keybinding: ${keybinding}`);
    appKeybindings[keybinding] = true;
  });
  
  // Register multiple app keybindings at once
  ipcMain.on('register-app-keybindings', (event, keybindings) => {
    try {
      // Avoid logging in production
      if (process.env.NODE_ENV === 'development') {
        console.log(`Registering multiple app keybindings:`, keybindings);
      }
      
      // Check if we actually have any new/changed keybindings
      if (keybindings && keybindings.bindings && Array.isArray(keybindings.bindings)) {
        // For object comparison, create sets to compare
        const newBindingsSet = new Set(keybindings.bindings.filter(b => typeof b === 'string'));
        const existingBindingsSet = new Set(Object.keys(appKeybindings));
        
        // Only perform the update if the sets differ (add or remove)
        let hasChanges = false;
        
        // Check if any bindings were added or removed
        if (newBindingsSet.size !== existingBindingsSet.size) {
          hasChanges = true;
        } else {
          // Check if all items in newBindings are in existingBindings
          for (const binding of newBindingsSet) {
            if (!existingBindingsSet.has(binding)) {
              hasChanges = true;
              break;
            }
          }
        }
        
        // If there are no changes, skip the update
        if (!hasChanges && !keybindings.clearExisting) {
          return;
        }
        
        // Clear existing bindings if requested
        if (keybindings.clearExisting) {
          appKeybindings = {};
        }
        
        // Add each keybinding
        keybindings.bindings.forEach(binding => {
          if (binding && typeof binding === 'string') {
            appKeybindings[binding] = true;
          }
        });
        
        // Send confirmation back to renderer
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('app-keybindings-updated', Object.keys(appKeybindings));
        }
      }
    } catch (error) {
      console.error('Error registering app keybindings:', error);
      // Try to send error back to renderer
      try {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('app-keybindings-error', {message: error.message});
        }
      } catch (e) {
        console.error('Failed to send error back to renderer:', e);
      }
    }
  });
  
  // Get all registered app keybindings
  ipcMain.handle('get-app-keybindings', async () => {
    return Object.keys(appKeybindings);
  });
  
  // Unregister all shortcuts
  ipcMain.on('unregister-shortcuts', () => {
    console.log('Unregistering all shortcuts');
    globalShortcut.unregisterAll();
    registeredShortcuts = [];
  });
  
  // Handle API key storage
  ipcMain.on('store-api-key', (event, { provider, key }) => {
    console.log(`Storing API key for ${provider}`);
    // In a real app, you'd want to store this securely
    // For demo, we're just acknowledging
  });
  
  // Handle API key retrieval
  ipcMain.handle('get-api-key', async (event, provider) => {
    console.log(`Getting API key for ${provider}`);
    // In a real app, this would retrieve from secure storage
    return null;
  });
  
  // Cookie management IPC handlers
  ipcMain.handle('get-all-cookies', async () => {
    try {
      console.log('Getting all cookies');
      const cookies = await mainWindow.webContents.session.cookies.get({});
      return cookies;
    } catch (error) {
      console.error('Error getting all cookies:', error);
      return [];
    }
  });
  
  ipcMain.handle('get-domain-cookies', async (event, domain) => {
    try {
      console.log(`Getting cookies for domain: ${domain}`);
      const cookies = await mainWindow.webContents.session.cookies.get({ domain });
      return cookies;
    } catch (error) {
      console.error(`Error getting cookies for domain ${domain}:`, error);
      return [];
    }
  });
  
  ipcMain.handle('clear-cookies', async (event, domain = null) => {
    try {
      if (domain) {
        console.log(`Clearing cookies for domain: ${domain}`);
        // Use clearStorageData for domain-specific clearing
        await mainWindow.webContents.session.clearStorageData({
          origin: `https://${domain}`,
          storages: ['cookies']
        });
        return { success: true, message: `Cookies cleared for ${domain}` };
      } else {
        console.log('Clearing all cookies');
        await mainWindow.webContents.session.clearStorageData({
          storages: ['cookies']
        });
        return { success: true, message: 'All cookies cleared' };
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Add handler for getting cookies for multiple domains
  ipcMain.handle('get-cookies-for-domains', async (event, domains) => {
    try {
      console.log(`Getting cookies for domains:`, domains);
      
      const results = {};
      
      for (const domain of domains) {
        const cookies = await mainWindow.webContents.session.cookies.get({ domain });
        results[domain] = cookies;
      }
      
      return results;
    } catch (error) {
      console.error('Error getting cookies for domains:', error);
      return {};
    }
  });
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay active until the user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up shortcut registration on app exit
app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// Handle IPC messages from renderer process
ipcMain.on('auth-token-update', (event, site, token) => {
  // Here you could save tokens to secure storage
  console.log(`Updated token for ${site}`);
}); 