const { app, BrowserWindow, ipcMain, dialog, globalShortcut, session, webContents } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Fix sqlite3 path issues in production builds
if (!isDev) {
  try {
    // Try to detect if we're in a packaged app with asar
    const appPath = app.getAppPath();
    const isAsar = appPath.includes('app.asar');
    
    if (isAsar) {
      // Set the sqlite3 binary path to the unpacked location
      process.env.SQLITE3_BINARY_PATH = path.join(
        path.dirname(appPath),
        'app.asar.unpacked',
        'node_modules',
        'sqlite3',
        'build',
        'Release'
      );
      
      console.log('Set SQLITE3_BINARY_PATH to:', process.env.SQLITE3_BINARY_PATH);
    }
  } catch (error) {
    console.error('Error setting up sqlite3 paths:', error);
  }
}

// Keep a global reference of the window object
let mainWindow;
// Track registered shortcuts
let registeredShortcuts = [];
// Track app-level keybindings (these will override browser shortcuts)
let appKeybindings = {};

// Configure autoUpdater with GitHub repository
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'jpaquino3',
  repo: 'AI_Toolbox'
});

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
  
  // Check for updates if not in development mode
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }
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
  
  // Handle clearing tool data
  ipcMain.handle('clear-tool-data', async (event, toolId) => {
    console.log(`Main process: Clearing data for tool: ${toolId}`);
    
    try {
      // First try to get the tools from the userData directory
      let tool = null;
      const userDataPath = path.join(app.getPath('userData'), 'categorizedTools.json');
      
      try {
        // Try reading from file system first
        if (fs.existsSync(userDataPath)) {
          const savedTools = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
          
          // Find the tool with the given id across all categories
          for (const category in savedTools) {
            const found = savedTools[category].find(t => t.id === toolId);
            if (found) {
              tool = found;
              break;
            }
          }
        } else {
          console.log(`categorizedTools.json not found at ${userDataPath}, requesting data from renderer`);
        }
      } catch (fileError) {
        console.error(`Error reading categorizedTools.json: ${fileError.message}`);
      }
      
      // If we couldn't find the tool from the file, try to get it from the renderer process
      if (!tool) {
        try {
          // Request the tools data from the renderer process
          const result = await event.sender.executeJavaScript(`
            (function() {
              try {
                const data = localStorage.getItem('categorizedTools');
                if (!data) return { success: false, message: 'No tools data found in localStorage' };
                
                const tools = JSON.parse(data);
                return { success: true, data: tools };
              } catch (err) {
                return { success: false, error: err.message };
              }
            })()
          `);
          
          if (result && result.success && result.data) {
            // Find the tool in the data from localStorage
            for (const category in result.data) {
              const found = result.data[category].find(t => t.id === toolId);
              if (found) {
                tool = found;
                break;
              }
            }
          }
        } catch (jsError) {
          console.error(`Error getting tools from renderer: ${jsError.message}`);
        }
      }
      
      if (!tool) {
        console.log(`Tool with ID ${toolId} not found`);
        return { success: false, error: `Tool with ID ${toolId} not found` };
      }
      
      console.log(`Found tool: ${tool.name} (${tool.url})`);
      
      // Parse the tool URL to get domain
      const parsedUrl = new URL(tool.url);
      const domain = parsedUrl.hostname;
      
      // Get all webContents
      const allWebContents = webContents.getAllWebContents();
      const mainWebContents = event.sender;
      
      console.log(`Total webContents: ${allWebContents.length}`);
      
      // First try to find the associated webContents for this tool
      const toolWebContents = allWebContents.find(wc => {
        try {
          if (wc.getURL().includes(domain)) {
            console.log(`Found matching webContents for ${domain}`);
            return true;
          }
          return false;
        } catch (err) {
          return false;
        }
      });
      
      if (toolWebContents) {
        console.log(`Clearing session for webContents associated with ${domain}`);
        
        // Clear all types of storage
        try {
          await toolWebContents.session.clearStorageData({
            storages: [
              'appcache',
              'cookies',
              'filesystem',
              'indexdb',
              'localstorage',
              'shadercache',
              'websql',
              'serviceworkers',
              'cachestorage'
            ],
            origin: tool.url
          });
          console.log(`Cleared session storage for ${domain}`);
        } catch (storageErr) {
          console.error(`Error clearing storage: ${storageErr}`);
        }
        
        // Clear cache
        try {
          await toolWebContents.session.clearCache();
          console.log(`Cleared cache for ${domain}`);
        } catch (cacheErr) {
          console.error(`Error clearing cache: ${cacheErr}`);
        }
        
        // Reload the webview to apply changes
        try {
          toolWebContents.reload();
          console.log(`Reloaded webContents for ${domain}`);
        } catch (reloadErr) {
          console.error(`Error reloading webContents: ${reloadErr}`);
        }
      }
      
      // Always clear cookies for the domain
      try {
        // Parse the domain to get base domain for cookies
        const domainParts = domain.split('.');
        const baseDomain = domainParts.length > 2 
          ? `.${domainParts.slice(domainParts.length - 2).join('.')}` 
          : `.${domain}`;
        
        const session = mainWebContents.session;
        
        // Handle OAuth domains specifically
        const authDomains = [
          `.${domain}`,
          baseDomain,
          '.google.com',
          '.accounts.google.com',
          '.login.microsoftonline.com',
          '.facebook.com',
          '.github.com'
        ];
        
        for (const authDomain of authDomains) {
          const cookies = await session.cookies.get({ domain: authDomain });
          console.log(`Found ${cookies.length} cookies for ${authDomain}`);
          
          for (const cookie of cookies) {
            try {
              await session.cookies.remove(authDomain, cookie.name);
              console.log(`Removed cookie ${cookie.name} from ${authDomain}`);
            } catch (err) {
              console.error(`Error removing cookie ${cookie.name}: ${err}`);
            }
          }
        }
        
        // Specifically clear OAuth tokens from all known OAuth providers
        if (domain.includes('google') || tool.url.includes('google') || tool.url.includes('oauth')) {
          // Extended list of Google OAuth cookies to clear
          const oauthCookies = [
            'SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'LSID', 
            '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID', '__Secure-3PAPISID',
            '__Secure-1PSIDCC', '__Secure-3PSIDCC', 'oauth_token', 'access_token', 
            'id_token', 'refresh_token', '__Host-3PLSID', '__Host-1PLSID',
            'ACCOUNT_CHOOSER', '__Host-GAPS', 'SIDCC'
          ];
          
          for (const cookieName of oauthCookies) {
            try {
              await session.cookies.remove('.google.com', cookieName);
              await session.cookies.remove('accounts.google.com', cookieName);
              console.log(`Removed OAuth cookie ${cookieName}`);
            } catch (err) {
              // Expected to fail for cookies that don't exist
              console.log(`Note: Couldn't remove cookie ${cookieName} (may not exist)`);
            }
          }
        }
        
        console.log(`Cleared cookies for ${domain} and related auth domains`);
      } catch (cookieErr) {
        console.error(`Error clearing cookies: ${cookieErr}`);
      }
      
      // Also clear partitioned data
      try {
        const session = mainWebContents.session;
        await session.clearStorageData({
          storages: ['cookies', 'localstorage', 'indexdb'],
          quotas: ['temporary', 'persistent', 'syncable'],
          origin: tool.url
        });
        console.log(`Cleared partitioned data for ${tool.url}`);
      } catch (partitionErr) {
        console.error(`Error clearing partitioned data: ${partitionErr}`);
      }
      
      // For Google OAuth tools, attempt to navigate to logout page
      const isGoogleOAuth = tool.url.includes('google.com') || 
                           tool.url.includes('accounts.google') || 
                           tool.url.toLowerCase().includes('oauth');
                           
      if (isGoogleOAuth) {
        try {
          console.log('Detected Google OAuth tool, attempting enhanced logout');
          
          // Create a hidden BrowserWindow for Google logout
          const logoutWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false, // Keep it hidden
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          });
          
          // Try multiple Google logout URLs for comprehensive sign-out
          const googleLogoutURLs = [
            'https://accounts.google.com/Logout',
            'https://accounts.google.com/logout',
            'https://mail.google.com/mail/logout',
            'https://www.google.com/accounts/Logout',
            'https://myaccount.google.com/logout'
          ];
          
          // Execute all logout URLs in sequence
          for (const logoutURL of googleLogoutURLs) {
            try {
              await logoutWindow.loadURL(logoutURL);
              console.log(`Navigated to Google logout page: ${logoutURL}`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (loadErr) {
              console.log(`Error loading ${logoutURL}: ${loadErr.message}`);
            }
          }
          
          // Try to revoke OAuth access
          try {
            await logoutWindow.loadURL('https://accounts.google.com/o/oauth2/revoke');
            console.log('Navigated to OAuth revoke endpoint');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (revokeErr) {
            console.log(`Error loading revoke endpoint: ${revokeErr.message}`);
          }
          
          // Try to revoke using myaccount authorization page
          try {
            await logoutWindow.loadURL('https://myaccount.google.com/permissions');
            console.log('Navigated to Google permissions page');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (permErr) {
            console.log(`Error loading permissions page: ${permErr.message}`);
          }
          
          // Destroy window when done
          logoutWindow.destroy();
          console.log('Completed Google OAuth logout process');
          
          // Clear any cookies that might have been re-added during logout
          try {
            await session.clearStorageData({
              storages: ['cookies'],
              origin: 'https://accounts.google.com'
            });
            console.log('Cleared any remaining Google cookies');
          } catch (err) {
            console.error('Error clearing final cookies:', err);
          }
        } catch (googleErr) {
          console.error('Error during Google OAuth logout process:', googleErr);
          // Don't fail the whole operation if this part fails
        }
      }
      
      // IMPORTANT: Delete the entire storage partition for this tool
      try {
        // Get all partition paths to check both apps' directories
        const appNames = ['ai-toolbox', 'aifm-toolbox-dashboard'];
        
        // Process each possible partition location (in both app directories)
        for (const appName of appNames) {
          try {
            const appUserDataPath = path.join(app.getPath('userData'), '..', appName);
            const partitionPath = path.join(appUserDataPath, 'Partitions', toolId);
            
            // Check if the partition directory exists
            if (fs.existsSync(partitionPath)) {
              console.log(`Found partition directory at ${partitionPath}`);
              
              // Try to remove the entire partition directory recursively
              try {
                fs.rmdirSync(partitionPath, { recursive: true, force: true });
                console.log(`Successfully deleted entire partition directory at ${partitionPath}`);
              } catch (rmError) {
                console.error(`Error deleting partition directory: ${rmError.message}`);
                
                // Fallback: If the entire directory can't be deleted, try to delete key files individually
                const keyFiles = [
                  'Cookies', 'Cookies-journal', 
                  path.join('Local Storage', 'leveldb'),
                  path.join('Session Storage', 'leveldb'),
                  'IndexedDB', 'Service Worker', 'Cache',
                  'WebStorage', 'databases', 'Network Persistent State',
                  'TransportSecurity', 'Trust Tokens'
                ];
                
                for (const file of keyFiles) {
                  const filePath = path.join(partitionPath, file);
                  if (fs.existsSync(filePath)) {
                    try {
                      if (fs.lstatSync(filePath).isDirectory()) {
                        fs.rmdirSync(filePath, { recursive: true, force: true });
                      } else {
                        fs.unlinkSync(filePath);
                      }
                      console.log(`Deleted ${filePath}`);
                    } catch (fileErr) {
                      console.error(`Error deleting ${filePath}: ${fileErr.message}`);
                    }
                  }
                }
              }
            } else {
              console.log(`Partition directory not found at ${partitionPath}`);
            }
          } catch (appErr) {
            console.error(`Error processing app directory ${appName}: ${appErr.message}`);
          }
        }
        
        // Also check for persist: partition format
        for (const appName of appNames) {
          try {
            const appUserDataPath = path.join(app.getPath('userData'), '..', appName);
            const persistPartitionPath = path.join(appUserDataPath, 'Partitions', `persist:${toolId}`);
            
            if (fs.existsSync(persistPartitionPath)) {
              console.log(`Found persist: partition directory at ${persistPartitionPath}`);
              
              try {
                fs.rmdirSync(persistPartitionPath, { recursive: true, force: true });
                console.log(`Successfully deleted entire persist: partition directory at ${persistPartitionPath}`);
              } catch (rmError) {
                console.error(`Error deleting persist: partition directory: ${rmError.message}`);
              }
            }
          } catch (appErr) {
            console.error(`Error processing persist: app directory ${appName}: ${appErr.message}`);
          }
        }
        
      } catch (partitionErr) {
        console.error(`Error deleting tool partition: ${partitionErr.message}`);
      }
      
      return { success: true, message: `Data for ${tool.name} cleared successfully` };
    } catch (error) {
      console.error('Error clearing tool data:', error);
      return { success: false, error: error.message };
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

  // Handle update checking
  ipcMain.handle('check-for-updates', async () => {
    if (isDev) {
      return { updateAvailable: false, error: 'Updates are disabled in development mode' };
    }
    
    try {
      await autoUpdater.checkForUpdates();
      return { checking: true };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { error: error.message };
    }
  });

  // Handle update download
  ipcMain.handle('download-update', async () => {
    if (isDev) {
      return { success: false, error: 'Updates are disabled in development mode' };
    }
    
    try {
      autoUpdater.downloadUpdate();
      return { downloading: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current app version
  ipcMain.handle('get-app-version', () => {
    return { version: app.getVersion() };
  });
}

// Setup auto updater events
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', { error: err.message });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj);
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

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