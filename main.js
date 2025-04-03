const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu, globalShortcut, webContents } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
const os = require('os');

// Get package version from package.json
try {
  const packageJson = require('./package.json');
  global.APP_VERSION = packageJson.version;
  console.log(`App version from package.json: ${global.APP_VERSION}`);
} catch (err) {
  console.error('Error reading package.json version:', err);
  global.APP_VERSION = app.getVersion();
  console.log(`Fallback app version from app: ${global.APP_VERSION}`);
}

// Explicitly set up global version constant that can be used throughout the app
global.APP_VERSION = global.APP_VERSION;
app.setVersion(global.APP_VERSION); // Make sure Electron app version is set correctly
console.log(`App version set to: ${global.APP_VERSION}`);

// Register essential IPC handlers immediately - this ensures they're available
// before any renderer process tries to access them
ipcMain.handle('get-app-version', () => {
  console.log(`get-app-version handler called, returning: ${global.APP_VERSION}`);
  return { 
    version: global.APP_VERSION,
    success: true 
  };
});

// Setup the autoUpdater with error handling to prevent crashes
let autoUpdater;
try {
  const { autoUpdater: electronUpdater } = require('electron-updater');
  autoUpdater = electronUpdater;
} catch (err) {
  console.error('Failed to initialize electron-updater:', err);
  // Create a mock autoUpdater as fallback
  autoUpdater = {
    logger: console,
    checkForUpdates: async () => null,
    downloadUpdate: async () => null,
    quitAndInstall: () => app.quit(),
    on: (event, callback) => {},
    removeAllListeners: () => {},
    emit: (event, ...args) => {},
    setFeedURL: () => {},
    allowDowngrade: true,
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: true
  };
}

// Variables for throttling progress updates
let lastProgressUpdateTime = Date.now();
const PROGRESS_UPDATE_INTERVAL = 1000; // 1 second

// Global references
let updateCacheDir;
let pendingUpdateFile = null;
global.pendingUpdateFile = null;

// Create cache directory for updates
try {
  updateCacheDir = path.join(app.getPath('userData'), 'updates');
  if (!fs.existsSync(updateCacheDir)) {
    fs.mkdirSync(updateCacheDir, { recursive: true });
  }
} catch (err) {
  console.error('Error creating update cache directory:', err);
}

// Remove all autoUpdater configuration and use our simplified update system instead
// Our simplified logger for update operations
const updaterLogger = {
  info: (...args) => console.log('Updater:', ...args),
  warn: (...args) => console.warn('Updater:', ...args),
  error: (...args) => console.error('Updater:', ...args),
  debug: (...args) => console.debug('Updater:', ...args)
};

// Create a safely stored copy of the update options
const UPDATE_OPTIONS = {
  owner: 'jpaquino3',
  repo: 'AI_Toolbox',
  releaseType: 'release',
  url: 'https://github.com/jpaquino3/AI_Toolbox',
  requestHeaders: {
    'User-Agent': 'AI-Toolbox-App',
    'Accept': 'application/vnd.github.v3+json'
  }
};

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

// Set app version as a global variable for the preload script
global.APP_VERSION = app.getVersion();
console.log(`App version: ${global.APP_VERSION} (${app.getVersion()})`);

// Keep a global reference of the window object
let mainWindow;
// Track registered shortcuts
let registeredShortcuts = [];
// Track app-level keybindings (these will override browser shortcuts)
let appKeybindings = {};

// Add additional logging
console.log(`Using real autoUpdater from electron-updater with GitHub repo: https://github.com/jpaquino3/AI_Toolbox`);

// Check if we should simulate updates (for testing - development mode only)
const shouldSimulateUpdate = isDev && process.env.SIMULATE_UPDATE === 'true';
if (shouldSimulateUpdate) {
  console.log('Update simulation mode is enabled (development only)');
}

// In development mode only, add helper functions for testing but still use real updater
if (isDev && shouldSimulateUpdate) {
  // These functions help simulate the update process during development
  global.mockUpdateAvailable = () => {
    console.log('Mocking update-available event (development only)');
    autoUpdater.emit('update-available', { version: '99.0.0', releaseDate: new Date().toISOString() });
  };
  
  global.mockUpdateDownloaded = () => {
    console.log('Mocking update-downloaded event (development only)');
    autoUpdater.emit('update-downloaded', { version: '99.0.0', releaseDate: new Date().toISOString() });
  };
  
  global.mockUpdateProgress = (percent) => {
    console.log(`Mocking download-progress event: ${percent}% (development only)`);
    autoUpdater.emit('download-progress', { percent: percent || 50 });
  };
  
  // For simulation mode, trigger events automatically (development only)
  if (shouldSimulateUpdate) {
    setTimeout(() => {
      console.log('Auto-triggering update-available event (simulation, development only)');
      global.mockUpdateAvailable();
    }, 5000);
  }
}

// Add a global variable to store update check results
let lastUpdateCheckResult = null;

// Function to get the latest GitHub release URL
async function getLatestReleaseUrl() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/jpaquino3/AI_Toolbox/releases/latest',
      headers: {
        'User-Agent': 'AI-Toolbox-Update-Client/1.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      method: 'GET'
    };

    console.log('Fetching latest release from GitHub...');
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const releaseInfo = JSON.parse(data);
            console.log('Latest release info:', JSON.stringify(releaseInfo, null, 2));
            
            // Log all available assets
            console.log('Available assets in release:');
            releaseInfo.assets.forEach(asset => {
              console.log(`- ${asset.name} (${asset.browser_download_url})`);
            });
            
            // Find the DMG asset
            const dmgAsset = releaseInfo.assets.find(asset => 
              asset.name && (
                asset.name.includes('-mac.') || 
                asset.name.includes('.dmg') || 
                asset.name.includes('darwin')
              )
            );

            if (!dmgAsset) {
              console.log('No DMG file found in release assets');
              reject(new Error('No DMG file found in latest release'));
              return;
            }

            const downloadUrl = dmgAsset.browser_download_url;
            console.log(`Selected DMG file for download: ${dmgAsset.name}`);
            console.log(`Download URL: ${downloadUrl}`);
            
            // Return both URL and filename
            resolve({
              url: downloadUrl,
              filename: dmgAsset.name  // Original filename from GitHub
            });
          } catch (error) {
            reject(new Error(`Failed to parse release info: ${error.message}`));
          }
        } else {
          reject(new Error(`Failed to fetch latest release: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.end();
  });
}

// Function to download update to Downloads folder for manual installation
async function downloadUpdateToDownloads() {
  try {
    console.log('Starting download of latest version...');
    
    // Get the latest release URL and filename
    const releaseInfo = await getLatestReleaseUrl();
    if (!releaseInfo || !releaseInfo.url) {
      throw new Error('Could not determine download URL');
    }

    console.log(`Using original filename: ${releaseInfo.filename}`);

    // Download to Downloads folder
    const filePath = await downloadToDownloadsFolder(releaseInfo.url, releaseInfo.filename);
    console.log(`Download completed to: ${filePath}`);

    // Notify renderer of success
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        filePath: filePath
      });
    }

    return { success: true, filePath };
  } catch (error) {
    console.error('Error downloading update:', error);
    
    // Notify renderer of error
    if (mainWindow) {
      mainWindow.webContents.send('update-error', { 
        message: `Download failed: ${error.message}`
      });
    }
    
    throw error;
  }
}

// Helper function to download a file to the Downloads folder
async function downloadToDownloadsFolder(url, filename) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Get Downloads folder path
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const filePath = path.join(downloadsPath, filename);
    
    console.log(`Downloading to: ${filePath}`);
    
    // Better handling of redirects
    const fetchWithRedirects = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }
      
      console.log(`Request attempt ${redirectCount + 1} for: ${currentUrl}`);
      
      // Parse the URL
      let parsedUrl;
      try {
        parsedUrl = new URL(currentUrl);
      } catch (error) {
        return reject(new Error(`Invalid URL: ${currentUrl} - ${error.message}`));
      }
      
      // Choose http or https module
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;
      
      // Make the request
      const req = requestModule.get(currentUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirect (${res.statusCode}) to: ${res.headers.location}`);
          
          // Construct absolute URL if relative
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            // Handle relative URLs
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            } else {
              redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.replace(/\/[^\/]*$/, '/')}${redirectUrl}`;
            }
          }
          
          console.log(`Following redirect to: ${redirectUrl}`);
          
          // Need a slight delay to avoid overwhelming the server with too many redirects
          setTimeout(() => {
            fetchWithRedirects(redirectUrl, redirectCount + 1);
          }, 100);
          return;
        }
        
        // Handle errors
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download: ${res.statusCode} ${res.statusMessage}`));
        }
        
        // Log file size if available
        const contentLength = res.headers['content-length'];
        if (contentLength) {
          console.log(`File size: ${parseInt(contentLength, 10)} bytes`);
        }
        
        // Create file stream
        const file = fs.createWriteStream(filePath);
        
        // Pipe the response directly to the file
        res.pipe(file);
        
        // Listen for errors on the file
        file.on('error', (err) => {
          // Clean up and reject
          file.close();
          fs.unlink(filePath, () => {});
          reject(new Error(`File write error: ${err.message}`));
        });
        
        // Listen for the finish event
        file.on('finish', () => {
          file.close();
          
          // Verify the file exists and has content
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              fs.unlink(filePath, () => {});
              reject(new Error('Downloaded file is empty'));
            } else {
              console.log(`Downloaded ${stats.size} bytes to ${filePath}`);
              resolve(filePath);
            }
          } catch (err) {
            reject(new Error(`Error verifying downloaded file: ${err.message}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (err) => {
        console.error(`Request error: ${err.message}`);
        fs.unlink(filePath, () => {});
        reject(new Error(`Request error: ${err.message}`));
      });
      
      // Set timeout
      req.setTimeout(30000, () => {
        console.error('Request timed out');
        req.abort();
        fs.unlink(filePath, () => {});
        reject(new Error('Request timed out'));
      });
    };
    
    // Start the download process
    fetchWithRedirects(url, 0);
  });
}

// Handle direct download when standard update method fails
async function directlyDownloadRelease(version) {
  updaterLogger.info('Using direct download method');
  return new Promise((resolve, reject) => {
    const https = require('https');
    const fs = require('fs');
    
    // On macOS we need to ensure we're downloading a .zip file, not a .dmg
    // Try multiple formats in case GitHub has different file formats available
    const attemptDownload = async (attempt = 0) => {
      // Different file format combinations to try
      const formats = [
        { extension: 'zip', platform: 'mac' },  // Try standard zip first
        { extension: 'dmg', platform: 'mac' },  // Then dmg as fallback
        { extension: 'zip', platform: 'darwin' } // Some repos use platform name differently
      ];
      
      // If we've tried all formats, give up
      if (attempt >= formats.length) {
        return reject(new Error(`Failed to download after trying ${formats.length} different formats`));
      }
      
      // Get the format to try for this attempt
      const format = formats[attempt];
      
      // Build filename based on this format
      const fileName = `AI-Toolbox-${version}-${format.platform}.${format.extension}`;
      const downloadUrl = `https://github.com/jpaquino3/AI_Toolbox/releases/download/v${version}/${fileName}`;
      
      updaterLogger.info(`Attempt ${attempt + 1}: Downloading from ${downloadUrl}`);
      
      // Create temp directory if needed
      const tempDir = app.getPath('temp');
      const downloadPath = path.join(tempDir, fileName);
      
      // Remove existing file if it exists
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
      
      // Function to handle the download with redirect support
      const downloadWithRedirects = (currentUrl, redirectCount = 0) => {
        // Prevent infinite redirects
        if (redirectCount > 5) {
          updaterLogger.error('Too many redirects, trying next format...');
          // Try next format
          return attemptDownload(attempt + 1);
        }
        
        updaterLogger.info(`Downloading from URL (attempt ${redirectCount + 1}): ${currentUrl}`);
        
        // Parse URL to determine protocol
        const urlObj = new URL(currentUrl);
        const protocol = urlObj.protocol === 'https:' ? https : require('http');
        
        const options = {
          headers: {
            'User-Agent': 'AI-Toolbox-Updater/1.0'
          }
        };
        
        const request = protocol.get(currentUrl, options, response => {
          // Handle redirects (status codes 301, 302, 303, 307, 308)
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            updaterLogger.info(`Redirect (${response.statusCode}) to: ${response.headers.location}`);
            
            // Follow the redirect
            downloadWithRedirects(response.headers.location, redirectCount + 1);
            return;
          }
          
          // If file not found (404) or access denied (403), try the next format
          if (response.statusCode === 404 || response.statusCode === 403) {
            updaterLogger.info(`File not available (${response.statusCode}), trying next format...`);
            // Try next format 
            return attemptDownload(attempt + 1);
          }
          
          // Handle other errors
          if (response.statusCode !== 200) {
            const errorMsg = `Download failed with status code: ${response.statusCode}`;
            updaterLogger.error(errorMsg);
            
            // Try next format
            return attemptDownload(attempt + 1);
          }
          
          // Successful download (status 200)
          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          updaterLogger.info(`Download started: ${currentUrl} (${totalBytes} bytes)`);
          
          // Download started event
          if (mainWindow) {
            mainWindow.webContents.send('update-status', {
              status: 'downloading',
              progress: 0
            });
          }
          
          // Create file stream
          const file = fs.createWriteStream(downloadPath);
          let receivedBytes = 0;
          
          response.pipe(file);
          
          // Track progress
          response.on('data', chunk => {
            receivedBytes += chunk.length;
            
            // Calculate percent
            const percent = totalBytes > 0 ? Math.floor((receivedBytes / totalBytes) * 100) : 0;
            
            // Log progress every 5MB
            if (receivedBytes % (5 * 1024 * 1024) < chunk.length) {
              updaterLogger.info(`Download progress: ${percent}% (${receivedBytes}/${totalBytes} bytes)`);
            }
            
            // Throttle renderer updates to reduce console spam
            const now = Date.now();
            if (now - lastProgressUpdateTime >= PROGRESS_UPDATE_INTERVAL || percent === 100) {
              lastProgressUpdateTime = now;
              
              // Emit progress to renderer (throttled)
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-status', {
                  status: 'downloading',
                  progress: percent
                });
                
                // Also send downloadProgress event for compatibility
                mainWindow.webContents.send('download-progress', {
                  percent,
                  transferred: receivedBytes,
                  total: totalBytes
                });
              }
            }
            
            // Emit progress as if it were from autoUpdater (to keep existing code working)
            // This is internal and doesn't cause console spam
            autoUpdater.emit('download-progress', {
              percent,
              transferred: receivedBytes,
              total: totalBytes
            });
          });
          
          response.on('end', () => {
            updaterLogger.info(`Download response ended`);
          });
          
          file.on('finish', () => {
            file.close();
            updaterLogger.info(`File writing finished: ${downloadPath}`);
            
            // Store the file for installation
            global.pendingUpdateFile = downloadPath;
            
            // Determine if we downloaded a .zip or .dmg (important for installation)
            const isZip = downloadPath.toLowerCase().endsWith('.zip');
            const isDmg = downloadPath.toLowerCase().endsWith('.dmg');
            
            // Emit events
            const updateInfo = {
              version: version,
              files: [{
                url: currentUrl,
                sha512: '',
                size: totalBytes
              }],
              path: downloadPath,
              releaseDate: new Date().toISOString(),
              isZip: isZip,
              isDmg: isDmg
            };
            
            autoUpdater.emit('update-downloaded', updateInfo);
            
            // Send UI update
            if (mainWindow) {
              mainWindow.webContents.send('update-downloaded', updateInfo);
              mainWindow.webContents.send('update-status', {
                status: 'downloaded',
                version: version,
                file: downloadPath,
                isZip: isZip,
                isDmg: isDmg
              });
            }
            
            // Mac success values depend on file type
            const result = {
              downloading: false,
              downloaded: true,
              success: true,
              downloadPath,
              isZip: isZip,
              isDmg: isDmg
            };
            
            updaterLogger.info(`Download completed successfully: ${downloadPath}`);
            
            resolve(result);
          });
          
          file.on('error', err => {
            updaterLogger.error(`File write error: ${err.message}`);
            fs.unlink(downloadPath, () => {});
            
            // Try next format
            return attemptDownload(attempt + 1);
          });
        });
        
        request.on('error', err => {
          updaterLogger.error(`Download request error: ${err.message}`);
          
          // Try next format
          return attemptDownload(attempt + 1);
        });
        
        // Set a timeout for the request
        request.setTimeout(30000, () => {
          request.abort();
          updaterLogger.error('Download request timed out');
          
          // Try next format
          return attemptDownload(attempt + 1);
        });
      };
      
      // Start download for this attempt
      downloadWithRedirects(downloadUrl);
    };
    
    // Start first download attempt
    attemptDownload(0);
  });
}

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
      additionalArguments: ['--enable-features=UseOzonePlatform', `--app-version=${app.getVersion()}`],
      // Enable webview file drops
      webSecurity: true,
      allowRunningInsecureContent: false,
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
    console.log('Development mode: Using dev-index.html');
    // In development mode, load our special development HTML file
    // which will then load the bundle from webpack dev server
    const devIndexPath = path.join(__dirname, 'dev-index.html');
    console.log('Loading dev index from:', devIndexPath);
    
    mainWindow.loadFile(devIndexPath)
      .then(() => {
        console.log('Dev index loaded successfully');
        // Open DevTools in development mode
        mainWindow.webContents.openDevTools();
      })
      .catch((err) => {
        console.error('Failed to load dev-index.html:', err);
        // Fall back to direct webpack URL as last resort
        mainWindow.loadURL('http://localhost:3001');
      });
  } else {
    const filePath = path.join(__dirname, 'build/index.html');
    console.log('Production mode: Loading file:', filePath);
    mainWindow.loadFile(filePath);
  }

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

  // Listen for webContents being created (for webviews)
  app.on('web-contents-created', (e, contents) => {
    // Enable file drops for webviews
    if (contents.getType() === 'webview') {
      console.log('Configuring webview for file drops');
      
      // Prevent navigation changes which might be triggered by dropping files
      contents.on('will-navigate', (e) => {
        console.log('Preventing webview navigation during drag/drop');
        e.preventDefault();
      });
      
      // Allow dropping files
      contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media' || permission === 'openExternal') {
          callback(true);
        } else {
          callback(false);
        }
      });
      
      // Enable drop events
      contents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape') {
          console.log('Escape pressed in webview, allowing default behavior');
          // Don't prevent the default behavior for Escape key in webviews
          event.preventDefault();
        }
      });
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

// Main app initialization
app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();
  setupIPC();
  setupUpdateHandlers(); // Initialize our simple update handlers
  
  // Check for updates on startup (after a delay)
  setTimeout(async () => {
    try {
      const updateResult = await checkForSimpleUpdates();
      if (updateResult.updateAvailable) {
        console.log('Update available on startup:', updateResult);
        mainWindow?.webContents.send('update-available', {
          version: updateResult.latestVersion,
          releaseNotes: updateResult.releaseNotes
        });
      }
  } catch (err) {
      console.error('Error checking for updates on startup:', err);
  }
  }, 10000); // Check after 10 seconds
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
    try {
      updaterLogger.info('Checking for updates...');
      
      // Use our simple update checker that doesn't rely on autoUpdater
      const result = await checkForSimpleUpdates();
      
      // Make sure we always include release notes in the response
      if (!result.releaseNotes && result.updateAvailable) {
        try {
          // If release notes are missing, try to fetch them directly
          const releases = await checkGitHubReleases();
          if (releases && releases.length > 0) {
            result.releaseNotes = releases[0].body || 'No release notes available';
          }
        } catch (notesError) {
          console.error('Error fetching release notes:', notesError);
          result.releaseNotes = 'Release notes could not be loaded.';
        }
      }
      
      updaterLogger.info('Update check completed successfully, result: ' + JSON.stringify(result));
      return result;
    } catch (error) {
      updaterLogger.error('Error checking for updates:', error);
      return { updateAvailable: false, error: error.message };
    }
  });

  // Add support for send/on pattern for update checking
  ipcMain.on('check-for-updates-request', async (event) => {
    try {
      updaterLogger.info('Checking for updates via send/on pattern...');
      const result = await autoUpdater.checkForUpdates();
      event.sender.send('check-for-updates-response', { checking: true, result });
    } catch (error) {
      updaterLogger.error('Error checking for updates:', error);
      event.sender.send('update-error', { error: true, message: error.message });
    }
  });

  // Add this before autoUpdater configuration
  function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
      return true;
    }
    return false;
  }

  // Auto-create the update cache directory
  const updateCacheDir = path.join(app.getPath('temp'), 'ai-toolbox-updater', 'pending');
  ensureDirectoryExists(updateCacheDir);
  updaterLogger.info(`Update cache directory: ${updateCacheDir}`);

  // Handle update downloads
  ipcMain.handle('download-update', async () => {
    try {
      updaterLogger.info('Download update requested');
      
      // For macOS, use our simpler download-to-Downloads-folder approach
      if (process.platform === 'darwin') {
        updaterLogger.info('Using direct download to Downloads folder for macOS');
        try {
          const result = await downloadUpdateToDownloads();
          updaterLogger.info(`Download completed to ${result.filePath}`);
          
          // Show success dialog
          dialog.showMessageBox({
            type: 'info',
            title: 'Update Downloaded',
            message: 'Update Downloaded Successfully',
            detail: `The update has been downloaded to:\n${result.filePath}\n\nWould you like to open it now?`,
            buttons: ['Open File', 'Show in Folder', 'Later'],
            defaultId: 0
          }).then(dialogResult => {
            if (dialogResult.response === 0) {
              // Open the file
              shell.openPath(result.filePath);
            } else if (dialogResult.response === 1) {
              // Show in folder
              shell.showItemInFolder(result.filePath);
            }
          });
          
          return { success: true, filePath: result.filePath };
        } catch (err) {
          updaterLogger.error('Error downloading update to Downloads folder:', err);
          throw err;
        }
      }
      
      // For other platforms, continue using standard approach
      autoUpdater.allowDowngrade = true;
      
      // For any version, try to use standard autoUpdater
      updaterLogger.info('Attempting download via standard autoUpdater mechanism');
      const downloadResult = await autoUpdater.downloadUpdate();
      updaterLogger.info('Download completed through autoUpdater');
      
      // Find the downloaded file
      // This will be platform-specific
      const downloadedFile = findDownloadedUpdate();
      
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        updaterLogger.info(`Verified download file exists at: ${downloadedFile}`);
        // Include the path so we can use it later
        global.pendingUpdateFile = downloadedFile;
        return { success: true, filePath: downloadedFile };
                        } else {
        updaterLogger.warn(`Download reported success but file not found at: ${downloadedFile}`);
        throw new Error('Downloaded update file not found');
      }
    } catch (error) {
      updaterLogger.error('Error downloading update:', error);
      throw error;
    }
  });
  
  // Add support for send/on pattern for update download
  ipcMain.on('download-update-request', async (event, specificVersion) => {
    try {
      // Log and enforce downgrade capability
      updaterLogger.info(`Download update requested via send/on pattern${specificVersion ? ` for version ${specificVersion}` : ''}`);
      autoUpdater.allowDowngrade = true;
      
      // IMPORTANT: We must get a reference to the update info first and use that for downloading
      let updateCheckResult;
      
      // Always check for updates first 
      updaterLogger.info('Checking for updates via send/on pattern...');
      try {
        // Force a full update check to populate the cache with available versions
        updateCheckResult = await autoUpdater.checkForUpdates();
        updaterLogger.info('Update check completed, result:', JSON.stringify(updateCheckResult || {}, null, 2));
        
        if (!updateCheckResult) {
          throw new Error('Update check returned null or undefined');
        }
        
        if (!updateCheckResult.updateInfo) {
          updaterLogger.error('Update info missing from check result. Raw result:', updateCheckResult);
          throw new Error('Update check did not return valid update info');
        }
        
        // Additional validation of update info
        if (!updateCheckResult.updateInfo.version) {
          updaterLogger.error('Version missing from update info:', updateCheckResult.updateInfo);
          throw new Error('Update info is missing version');
        }
        
        // If we're requesting a specific version, modify the update info
        if (specificVersion) {
          updaterLogger.info(`Setting target version for download: ${specificVersion}`);
          
          // Store the original version
          const originalVersion = updateCheckResult.updateInfo.version;
          updaterLogger.info(`Original version from update: ${originalVersion}`);
          
          // Override the version info for the download
          updateCheckResult.updateInfo.version = specificVersion;
          
          // Update the path to match the requested version if it exists
          if (updateCheckResult.updateInfo.path) {
            const oldPath = updateCheckResult.updateInfo.path;
            updateCheckResult.updateInfo.path = updateCheckResult.updateInfo.path.replace(
              originalVersion, 
              specificVersion
            );
            updaterLogger.info(`Updated path from ${oldPath} to ${updateCheckResult.updateInfo.path}`);
          }
          
          // Update any URLs in the files array if present
          if (updateCheckResult.updateInfo.files && Array.isArray(updateCheckResult.updateInfo.files)) {
            updateCheckResult.updateInfo.files.forEach(file => {
              if (file.url) {
                const oldUrl = file.url;
                file.url = file.url.replace(originalVersion, specificVersion);
                updaterLogger.info(`Updated file URL from ${oldUrl} to ${file.url}`);
              }
            });
          }
          
          updaterLogger.info('Modified update info for version:', JSON.stringify(updateCheckResult.updateInfo, null, 2));
        }
        
        // Additional validation that files exist for macOS
        if (process.platform === 'darwin' && 
            (!updateCheckResult.updateInfo.files || 
             !updateCheckResult.updateInfo.files.length || 
             !updateCheckResult.updateInfo.files.some(f => f.url && f.url.includes('-mac.')))) {
          
          updaterLogger.error('Missing macOS update files:', updateCheckResult.updateInfo.files);
          throw new Error('Update info is missing required macOS files');
        }
        
        // Give the autoUpdater time to process the update info
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (checkError) {
        updaterLogger.error('Error checking for updates before download:', checkError);
        event.sender.send('update-error', { 
          error: true, 
          message: `Update check failed: ${checkError.message}` 
        });
        return;
      }
      
      // Now try to download
      updaterLogger.info('Now attempting to download update via send/on pattern...');
      // Use the updateInfo directly
      if (updateCheckResult && updateCheckResult.cancellationToken) {
        await autoUpdater.downloadUpdate(updateCheckResult.cancellationToken);
      } else {
        // Fallback to standard download if we don't have a token
      await autoUpdater.downloadUpdate();
      }
      
      // Send success response
      event.sender.send('download-update-response', { downloading: true, success: true });
    } catch (error) {
      updaterLogger.error('Error downloading update:', error);
      
      // Check for specific known errors
      if (error.code === 'ERR_CERT_COMMON_NAME_INVALID') {
        event.sender.send('update-error', { 
          error: true, 
          message: 'Certificate validation error. Please try a different network connection.' 
        });
      } else if (error.message && error.message.includes('Please check update first')) {
        event.sender.send('update-error', { 
          error: true, 
          message: 'Update check required first. Please try again or restart the app.' 
        });
      } else {
        // Send generic error response
      event.sender.send('update-error', { 
        error: true, 
        message: error.message 
      });
      }
    }
  });
  
  // Handle quit and install
  ipcMain.handle('quit-and-install', async () => {
    updaterLogger.info('Quitting and installing update...');
    
    try {
    // Check if we have a pending update file
    if (global.pendingUpdateFile) {
        updaterLogger.info(`Installing directly downloaded update: ${global.pendingUpdateFile}`);
      
      // Verify the file actually exists
      if (!fs.existsSync(global.pendingUpdateFile)) {
          updaterLogger.error(`ERROR: Pending update file does not exist: ${global.pendingUpdateFile}`);
        return { success: false, error: 'Update file not found' };
      }
      
        // Handle macOS updates
        if (process.platform === 'darwin') {
          try {
            // First try the simplified direct update method with hardcoded paths
            updaterLogger.info(`Starting simplified manual update: ${global.pendingUpdateFile}`);
            try {
              const result = await performManualMacOSUpdate(global.pendingUpdateFile);
              return { success: result };
            } catch (manualErr) {
              updaterLogger.error('Manual update failed, trying standard installer:', manualErr);
              
              // Fall back to the regular installer
              if (global.pendingUpdateFile.toLowerCase().endsWith('.zip')) {
                try {
          const result = await installMacOSUpdate(global.pendingUpdateFile);
          return { success: result };
        } catch (err) {
                  updaterLogger.error('All update methods failed:', err);
                  
                  // If we get a TARGET_APP error, provide a clearer message
                  if (err.message && (
                      err.message.includes('TARGET_APP is not defined') || 
                      err.message.includes('Could not determine the application path')
                  )) {
                    return { 
                      success: false, 
                      error: 'Could not install the update. Please download the update manually from GitHub and replace the app in your Applications folder.' 
                    };
                  }
                  
                  // Generic error
                  return { success: false, error: `Update installation failed: ${err.message}` };
                }
              } else {
                // For DMG files, just use the standard method
                try {
          autoUpdater.quitAndInstall(false, true);
          return { success: true };
                } catch (err) {
                  return { success: false, error: `Standard installation failed: ${err.message}` };
                }
              }
            }
          } catch (err) {
            updaterLogger.error('Error during macOS update:', err);
            return { success: false, error: `Update failed: ${err.message}. Please try downloading the update manually from GitHub.` };
        }
      } else {
          // For non-macOS platforms, use standard method
          updaterLogger.info(`Using standard installation for file: ${global.pendingUpdateFile}`);
          try {
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
          } catch (err) {
            updaterLogger.error('Error during standard installation:', err);
            return { success: false, error: 'Standard update installation failed. Please try downloading the update manually from GitHub.' };
          }
      }
    } else {
      // Check if autoUpdater has a downloaded update
      try {
        // Log the current state of the updater
          updaterLogger.info('No pendingUpdateFile found, checking if autoUpdater has downloaded update');
        
        // Use standard method if no pending update file
          updaterLogger.info('Using standard quitAndInstall method');
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
      } catch (err) {
          updaterLogger.error('Error during quitAndInstall:', err);
          return { success: false, error: `Update installation failed: ${err.message}. Please try downloading the update manually from GitHub.` };
      }
      }
    } catch (err) {
      updaterLogger.error('Unexpected error during update installation:', err);
      return { success: false, error: `Unexpected error: ${err.message}. Please try downloading the update manually from GitHub.` };
    }
  });

  // Handle getting app version
  ipcMain.handle('get-app-version', () => {
    console.log(`get-app-version handler called, returning: ${global.APP_VERSION}`);
    
    // Return all possible version sources to help debug
    return { 
      version: global.APP_VERSION || app.getVersion() || global.APP_VERSION || '1.3.34',
      packageVersion: global.APP_VERSION,
      appGetVersion: app.getVersion(),
      globalAppVersion: global.APP_VERSION,
      success: true 
    };
  });
  
  // DEBUG: Add mock update handlers (only in development)
  if (isDev) {
    ipcMain.handle('mock-update-available', () => {
      global.mockUpdateAvailable();
      return { success: true };
    });
    
    ipcMain.handle('mock-update-downloaded', () => {
      global.mockUpdateDownloaded();
      return { success: true };
    });
    
    ipcMain.handle('mock-update-progress', (event, percent) => {
      global.mockUpdateProgress(percent);
      return { success: true };
    });
  }

  // Handle revealing files in Finder
  ipcMain.handle('reveal-file-in-finder', async (event, filePath) => {
    try {
      console.log(`Received request to reveal file: ${filePath}`);
      
      // List of possible paths to check (in order of likelihood)
      const pathsToTry = [
        // Direct paths
        filePath,
        
        // AIToolbox folder directly in home
        path.join(app.getPath('home'), 'AIToolbox', filePath),
        
        // Current app path + filename
        path.join(app.getAppPath(), filePath),
        
        // Home + filename
        path.join(app.getPath('home'), filePath),
        
        // Documents folder
        path.join(app.getPath('home'), 'Documents', 'AIToolbox', filePath)
      ];
      
      // Try each path until one works
      for (const pathToTry of pathsToTry) {
        console.log(`Trying to reveal: ${pathToTry}`);
        
        try {
          await shell.showItemInFolder(pathToTry);
          console.log(`Successfully revealed: ${pathToTry}`);
          return { success: true };
        } catch (err) {
          console.log(`Failed with path: ${pathToTry}`);
          // Continue to next path
        }
      }
      
      // If we get here, none of the paths worked
      console.error('Could not find file in any expected location');
      return { success: false, error: 'File not found in expected locations' };
    } catch (error) {
      console.error(`Error revealing file in Finder: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // Handle folder selection
  ipcMain.handle('select-folder', async (event) => {
    try {
      console.log('Opening folder selection dialog');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Media Folder'
      });
      
      if (result.canceled) {
        console.log('Folder selection cancelled');
        return { success: false, canceled: true };
      }
      
      const folderPath = result.filePaths[0];
      console.log(`Selected folder: ${folderPath}`);
      return { success: true, folderPath };
    } catch (error) {
      console.error(`Error selecting folder: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // Handle getting images from a folder
  ipcMain.handle('get-images-from-folder', async (event, folderPath) => {
    try {
      console.log(`Getting images from folder: ${folderPath}`);
      
      // Check if folder exists
      if (!fs.existsSync(folderPath)) {
        console.error(`Folder does not exist: ${folderPath}`);
        return { success: false, error: 'Folder does not exist' };
      }
      
      // Get list of files in folder
      const files = fs.readdirSync(folderPath);
      console.log(`Found ${files.length} files in folder`);
      
      // Filter for image files and create file objects
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
      const imageFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        })
        .map(file => {
          const filePath = path.join(folderPath, file);
          const stats = fs.statSync(filePath);
          
          // Generate a proper file URL that works in webviews
          const fileUrl = pathToFileURL(filePath);
          
          return {
            name: file,
            path: filePath,
            url: fileUrl,
            size: stats.size,
            lastModified: stats.mtime
          };
        });
      
      console.log(`Found ${imageFiles.length} image files`);
      return { success: true, files: imageFiles };
    } catch (error) {
      console.error(`Error getting images from folder: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Add this helper function for adding timeouts to promises
  function withTimeout(promise, timeoutMs = 10000, errorMessage = 'Operation timed out') {
    let timeoutId;
    
    // Create a promise that rejects after timeoutMs milliseconds
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });
    
    // Race the original promise against the timeout
    return Promise.race([
      promise,
      timeoutPromise
    ]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  // Function to directly check GitHub releases without authentication
  async function checkGitHubReleases() {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      // Use public releases API endpoint with no authentication
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: '/repos/jpaquino3/AI_Toolbox/releases',
        headers: {
          'User-Agent': 'AI-Toolbox-Update-Client/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        method: 'GET'
      };
      
      console.log(`Checking GitHub releases using public API: https://${options.hostname}${options.path}`);
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const releases = JSON.parse(data);
              resolve(releases);
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          } else {
            // For GitHub API issues, include detailed error information
            const errorMsg = `HTTP error: ${res.statusCode}`;
            console.error(`${errorMsg} when accessing GitHub API:`, data);
            reject(new Error(`${errorMsg}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error("GitHub API network error:", error.message);
        reject(error);
      });
      
      // Set timeout
      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error("GitHub API request timed out"));
      });
      
      req.end();
    });
  }

  // Modify the checkForSimpleUpdates function
  async function checkForSimpleUpdates() {
    console.log('Checking for updates from GitHub releases...');
    
    try {
      // Add timeout to the GitHub API call
      const releases = await withTimeout(
        checkGitHubReleases(),
        15000,
        'GitHub API request timed out'
      );
      
      console.log(`Received ${releases.length} releases from GitHub`);
      
      if (!releases || !releases.length) {
        console.log('No releases found');
        return { updateAvailable: false };
      }
      
      // Get latest release
      const latestRelease = releases[0];
      console.log(`Latest release: ${latestRelease.tag_name || latestRelease.name}`);
      
      // Parse version - clean up tag name by removing 'v' prefix if present
      let latestVersion = latestRelease.tag_name || latestRelease.name || '';
      if (latestVersion.startsWith('v')) {
        latestVersion = latestVersion.substring(1);
      }
      
      console.log(`Latest version: ${latestVersion}, Current version: ${global.APP_VERSION}`);
      
      // Compare with current version
      const updateAvailable = latestVersion !== global.APP_VERSION;
      
      // Download URL for macOS
      let downloadUrl = '';
      if (latestRelease.assets && latestRelease.assets.length) {
        // Look for macOS specific assets
        const macAsset = latestRelease.assets.find(asset => 
          asset.name && (
            asset.name.includes('-mac.') || 
            asset.name.includes('.dmg') || 
            asset.name.includes('darwin')
          )
        );
        
        if (macAsset) {
          downloadUrl = macAsset.browser_download_url;
          console.log(`Found macOS download URL: ${downloadUrl}`);
        } else {
          // If no mac-specific asset found, use the first download URL
          downloadUrl = latestRelease.assets[0].browser_download_url;
          console.log(`No macOS asset found, using first asset: ${downloadUrl}`);
        }
      }
      
      // If still no URL, use the generic release URL
      if (!downloadUrl && latestRelease.html_url) {
        downloadUrl = latestRelease.html_url;
        console.log(`No assets found, using release page URL: ${downloadUrl}`);
      }
      
      // Get release notes
      const releaseNotes = latestRelease.body || '';
      
      console.log(`Update check complete - Update available: ${updateAvailable}`);
      
      // If update is available, notify renderer
      if (updateAvailable && mainWindow) {
        mainWindow.webContents.send('update-available', {
          version: latestVersion,
          releaseNotes: releaseNotes,
          downloadUrl: downloadUrl
        });
      } else if (mainWindow) {
        mainWindow.webContents.send('update-not-available');
      }
      
      return {
        updateAvailable,
        latestVersion,
        releaseNotes,
        downloadUrl
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      
      // Notify renderer of error
      if (mainWindow) {
        mainWindow.webContents.send('update-error', { 
          message: `Update check failed: ${error.message}`
        });
      }
      
      return { 
        updateAvailable: false, 
        error: error.message 
      };
    }
  }

  // Add this to the setupIPC function
  ipcMain.handle('check-github-releases', async () => {
    try {
      const releases = await checkGitHubReleases();
      return { success: true, releases };
    } catch (error) {
      updaterLogger.error(`Error checking GitHub releases: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Add a handler to get release notes
  ipcMain.handle('get-release-notes', async () => {
    try {
      // Fetch the latest release from GitHub
      const releases = await checkGitHubReleases();
      
      if (!releases || releases.length === 0) {
        return { success: false, error: 'No releases found' };
      }
      
      const latestRelease = releases[0];
      const releaseNotes = latestRelease.body || '';
      const version = (latestRelease.tag_name || '').replace(/^v/, '');
      
      return { 
        success: true, 
        releaseNotes, 
        version,
        publishedAt: latestRelease.published_at,
        releaseUrl: latestRelease.html_url
      };
    } catch (error) {
      console.error('Error fetching release notes:', error);
      return { success: false, error: error.message };
    }
  });
}

// Helper function to convert a file path to a proper file:// URL
function pathToFileURL(filePath) {
  if (!filePath) return '';
  
  try {
    // Ensure the path is absolute
    const absolutePath = path.resolve(filePath);
    
    // First clean any existing file:// prefixes to prevent duplication
    let cleanPath = absolutePath;
    if (cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.substring(7);
      // Remove any leading slashes after removing prefix
      while (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }
    }
    
    // Add the file:// prefix properly
    let fileURL = 'file://';
    
    // On macOS, paths starting with / need three slashes total (file:///)
    // On Windows, paths need a leading slash after file://
    if (process.platform === 'darwin' && cleanPath.startsWith('/')) {
      fileURL += '/';
    } else if (process.platform === 'win32') {
      fileURL += '/';
    }
    
    // Replace backslashes with forward slashes and encode special characters
    const normalizedPath = cleanPath.replace(/\\/g, '/');
    
    // Split the path into segments and encode each segment
    const segments = normalizedPath.split('/');
    const encodedSegments = segments.map(segment => 
      // Don't encode : and / characters
      encodeURIComponent(segment).replace(/%3A/g, ':')
    );
    
    // Join the segments, ensuring empty segments remain (important for paths with multiple slashes)
    let encodedPath = '';
    for (let i = 0; i < segments.length; i++) {
      // If this is an empty segment (due to leading/consecutive slashes), preserve it
      if (segments[i] === '') {
        encodedPath += '/';
      } 
      // Otherwise add the encoded segment with a separator
      else {
        if (i > 0) encodedPath += '/';
        encodedPath += encodedSegments[i];
      }
    }
    
    fileURL += encodedPath;
    
    // Final sanity check to ensure we don't have duplicate slashes
    // Replace any sequence of more than 3 slashes after file: with exactly 3
    fileURL = fileURL.replace(/file:\/+/, 'file:///');
    
    console.log(`Converted path "${filePath}" to URL "${fileURL}"`);
    return fileURL;
  } catch (err) {
    console.error(`Error in pathToFileURL:`, err);
    // Return a basic fallback
    return `file:///${filePath.replace(/\\/g, '/')}`;
  }
}

// Add a global variable to track the most recent downloaded update file
let lastDownloadedUpdateFile = null;

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

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  
  // Store the downloaded file path for later use
  if (info.downloadedFile) {
    lastDownloadedUpdateFile = info.downloadedFile;
    global.pendingUpdateFile = info.downloadedFile;
    updaterLogger.info(`Stored download path: ${info.downloadedFile}`);
  } else {
    updaterLogger.warn('Update downloaded but no downloadedFile property provided');
  }
  
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (error) => {
  let errorMessage = `Update error: ${error.message}`;
  
  // Better logging for HTTP errors
  if (error.code) {
    errorMessage += ` (Code: ${error.code})`;
  }

  if (error.statusCode) {
    errorMessage += ` [Status: ${error.statusCode}]`;
  }
  
  // Log GitHub API specific details if available
  if (error.response) {
    try {
      const responseData = JSON.stringify(error.response);
      errorMessage += ` - Response: ${responseData}`;
    } catch (e) {
      errorMessage += ` - Raw response available but not printable`;
    }
  }
  
  updaterLogger.error(errorMessage);
  
  // For network errors, suggest checking internet connection
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    updaterLogger.error('Network error detected. Please check your internet connection.');
  }
  
  // For GitHub specific errors
  if (error.message.includes('GitHub')) {
    updaterLogger.error('GitHub API error detected. Verify the repository configuration and permissions.');
  }
  
  // Notify the renderer of the error
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', {
      error: errorMessage
    });
  }
});

// Add this at the top of your file with other variable declarations
let lastProgressLogTime = 0;
const PROGRESS_LOG_INTERVAL = 3000; // 3 seconds in milliseconds

// Then find the section that handles download progress and modify it to include throttling
// It's likely in a function that handles autoUpdater.on('download-progress') or similar

// Example of what to change (adapt to your actual code):
autoUpdater.on('download-progress', (progressObj) => {
  const now = Date.now();
  
  // Always update the UI
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
  
  // But only log to console every 3 seconds
  if (now - lastProgressLogTime >= PROGRESS_LOG_INTERVAL) {
    lastProgressLogTime = now;
    updaterLogger.info(`Download progress: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`);
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

// Function to handle macOS update installation
async function installMacOSUpdate(filePath) {
  const fs = require('fs');
  const { spawn } = require('child_process');
  
  if (!fs.existsSync(filePath)) {
    updaterLogger.error(`Update file not found: ${filePath}`);
    throw new Error('Update file not found');
  }
  
  // Create a progress window
  let progressWindow = new BrowserWindow({
    width: 400,
    height: 200,
    show: false,
    resizable: false,
    frame: true,
    fullscreenable: false,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    parent: mainWindow
  });
  
  const tempDir = app.getPath('temp');
  
  // Create a unique log directory to keep all update files together
  const updateId = Date.now();
  const updateLogDir = path.join(tempDir, `ai-toolbox-update-${updateId}`);
  fs.mkdirSync(updateLogDir, { recursive: true });
  
  const progressHtmlPath = path.join(updateLogDir, 'update-progress.html');
  const logFilePath = path.join(updateLogDir, 'update-log.txt');
  
  // Simple HTML file for the progress window
  fs.writeFileSync(progressHtmlPath, `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Installing Update</title>
        <style>
          body { font-family: system-ui; margin: 0; padding: 20px; background-color: #f5f5f7; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
          h3 { margin-bottom: 20px; font-size: 16px; text-align: center; }
          progress { width: 90%; height: 10px; border-radius: 5px; }
          .message { margin-top: 15px; font-size: 14px; min-height: 20px; }
        </style>
      </head>
      <body>
        <h3>Installing Update</h3>
        <progress id="progress" value="0" max="100"></progress>
        <div class="message" id="message">Preparing installation...</div>
        <script>
          const { ipcRenderer } = require('electron');
          const progress = document.getElementById('progress');
          const message = document.getElementById('message');
          
          ipcRenderer.on('update-progress', (event, percent, msg) => {
            progress.value = percent;
            if (msg) message.textContent = msg;
          });
          
          ipcRenderer.send('progress-window-ready');
        </script>
      </body>
    </html>
  `);
  
  // Initialize log file
  fs.writeFileSync(logFilePath, `Update started at ${new Date().toString()}\n`);
  
  // Helper function to log to both console and file
  const appendLog = (message) => {
    try {
      fs.appendFileSync(logFilePath, `${new Date().toISOString()}: ${message}\n`);
      updaterLogger.info(message);
    } catch (err) {
      updaterLogger.error(`Failed to write to log: ${err.message}`);
    }
  };
  
  try {
    // Show the progress window
    await progressWindow.loadFile(progressHtmlPath);
    progressWindow.setMenuBarVisibility(false);
    progressWindow.once('ready-to-show', () => {
      progressWindow.show();
      appendLog('Progress window shown');
    });
    
    // Wait for ready event
    await new Promise(resolve => {
      ipcMain.once('progress-window-ready', () => resolve());
      setTimeout(resolve, 2000); // Fallback timeout
    });
    
    // Begin installation
    appendLog(`Starting update from file: ${filePath}`);
    progressWindow.webContents.send('update-progress', 10, 'Beginning installation...');
    
    // HARDCODE THE APP PATH - This is the fix for the "TARGET_APP is not defined" error
    const targetAppPath = "/Applications/AI-Toolbox.app";
    appendLog(`Using hardcoded application path: ${targetAppPath}`);
    
    // Check if the hardcoded path exists
    if (fs.existsSync(targetAppPath)) {
      appendLog(`Verified application exists at: ${targetAppPath}`);
    } else {
      appendLog(`Warning: Application does not exist at ${targetAppPath}, will create it during installation`);
    }
    
    // Get current application info - still try to get this for logging, but we'll use the hardcoded path
    const currentAppPath = app.getAppPath();
    // In macOS, app.getAppPath() points to /Path/To/App.app/Contents/Resources/app 
    // Go up two levels to get the .app bundle
    let appBundle = path.dirname(path.dirname(currentAppPath));
    
    // For production app, ensure we go up one more level to get to the .app bundle
    if (!appBundle.endsWith('.app') && fs.existsSync(path.dirname(appBundle))) {
      appBundle = path.dirname(appBundle);
    }
    
    // Ensure appBundle ends with .app
    if (!appBundle.endsWith('.app')) {
      // Try to find the .app parent
      let tempPath = appBundle;
      while (!tempPath.endsWith('.app') && tempPath !== '/') {
        tempPath = path.dirname(tempPath);
        if (tempPath.endsWith('.app')) {
          appBundle = tempPath;
          break;
        }
      }
    }
    
    const appName = "AI-Toolbox"; // Hardcode the app name
    const targetDir = path.dirname(targetAppPath);
    
    appendLog(`Current app detection: ${appName} at ${appBundle}`);
    appendLog(`Target directory: ${targetDir}`);
    appendLog(`Using hardcoded target path: ${targetAppPath}`);
    
    progressWindow.webContents.send('update-progress', 20, 'Preparing installation...');
    
    // Check if it's a .zip or .dmg file
    const isZip = filePath.toLowerCase().endsWith('.zip');
    const isDmg = filePath.toLowerCase().endsWith('.dmg');
    
    if (!isZip && !isDmg) {
      throw new Error(`Unsupported file format: ${filePath}. Expected .zip or .dmg`);
    }
    
    // Verify the target path exists (or at least the directory)
    if (!fs.existsSync(targetDir)) {
      appendLog(`Warning: Target directory ${targetDir} doesn't exist, will create it during installation`);
    } else {
      appendLog(`Target directory ${targetDir} exists, good`);
    }
    
    // Create a helper script that will manually complete the installation
    // This approach avoids the complexity and potential issues with Node.js file operations
    const installScriptPath = path.join(updateLogDir, 'install.sh');
    
    // This script is intentionally comprehensive to handle all the edge cases for macOS
    // installation, including permissions, quarantine, and signature verification
    const installScript = `#!/bin/bash

# Installation script for AI Toolbox macOS update
# Generated: $(date)
# Source file: ${filePath}
# Log directory: ${updateLogDir}

# Strict error handling
set -e
set -o pipefail

# Log function
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "${logFilePath}"
}

# Define critical variables explicitly at the top with clear validation
log "=== AI Toolbox Update Installation Started ==="
log "Current user: $(whoami)"
log "Update file: ${filePath}"
log "Target directory: ${targetDir}"

# FIXED: Hardcode the absolute path to the target application
# This ensures TARGET_APP is always defined, fixing the "TARGET_APP is not defined" error
TARGET_APP="${targetAppPath}"

# Validation with fallback options
if [ -z "$TARGET_APP" ]; then
  log "WARNING: TARGET_APP is somehow empty despite being hardcoded, trying alternative methods"
  
  # Hardcoded fallback - this should never fail
  TARGET_APP="/Applications/AI-Toolbox.app"
  log "Using hardcoded fallback: $TARGET_APP"
fi

log "Final target application path: $TARGET_APP"
log "Target app parent exists: $([ -d "$(dirname "$TARGET_APP")" ] && echo 'Yes' || echo 'No - Will be created')"
log "Target app exists: $([ -d "$TARGET_APP" ] && echo 'Yes' || echo 'No - Will be created/replaced')"

# Create working directory
WORK_DIR="${updateLogDir}/work"
mkdir -p "$WORK_DIR"
log "Created working directory: $WORK_DIR"

# Function to clean up temporary files/mounts when script exits
cleanup() {
  log "Performing cleanup"
  
  # Unmount DMG if it was mounted
  if [ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ]; then
    log "Unmounting DMG from $MOUNT_POINT"
    hdiutil detach "$MOUNT_POINT" -force || true
  fi
  
  # Note: We keep the work directory for debugging purposes
  log "Cleanup complete"
}

# Set trap to call cleanup on exit
trap cleanup EXIT

# Extract or mount the update file
${isZip ? `
# Extract ZIP file
log "Extracting ZIP file to $WORK_DIR"
unzip -o "${filePath}" -d "$WORK_DIR"
if [ $? -ne 0 ]; then
  log "ERROR: Failed to extract ZIP file"
  exit 1
fi
log "ZIP extraction complete"

# Find the app in the extracted contents
APP_PATH=$(find "$WORK_DIR" -name "*.app" -type d -maxdepth 3 | head -1)
` : `
# Mount DMG file
log "Mounting DMG file"
MOUNT_POINT=$(hdiutil attach "${filePath}" -nobrowse -noautoopen | grep "/Volumes/" | awk '{print $3}')
if [ -z "$MOUNT_POINT" ]; then
  log "ERROR: Failed to mount DMG file"
  exit 1
fi
log "DMG mounted at: $MOUNT_POINT"

# Find the app in the mounted DMG
APP_PATH=$(find "$MOUNT_POINT" -name "*.app" -type d -maxdepth 3 | head -1)
`}

if [ -z "$APP_PATH" ]; then
  log "ERROR: Could not find .app bundle in the update package"
  exit 1
fi

log "Found application at: $APP_PATH"

# Verify the application bundle structure
log "Verifying application bundle structure"
if [ ! -d "$APP_PATH/Contents" ]; then
  log "ERROR: Invalid application bundle (missing Contents directory)"
  exit 1
fi

if [ ! -d "$APP_PATH/Contents/MacOS" ]; then
  log "ERROR: Invalid application bundle (missing MacOS directory)"
  exit 1
fi

# Verify code signature (but continue even if it fails)
log "Verifying code signature"
codesign --verify --verbose "$APP_PATH" > "${updateLogDir}/codesign-verify.log" 2>&1 || true
spctl --assess --type execute "$APP_PATH" > "${updateLogDir}/spctl-assess.log" 2>&1 || true

# Double check the target application path for safety
if [ ! -d "$(dirname "$TARGET_APP")" ]; then
  log "WARNING: Target directory doesn't exist, creating it"
  mkdir -p "$(dirname "$TARGET_APP")"
fi
log "Confirmed target application path: $TARGET_APP" 

# Check for running instances and ask them to quit
log "Checking for running instances of the application"
APP_PROCESS_NAME="${appName}"
osascript -e 'tell application "System Events" to set appIsRunning to (name of processes) contains "'$APP_PROCESS_NAME'"'
if [ $? -eq 0 ]; then
  log "Application is running, attempting to quit"
  osascript -e 'tell application "'$APP_PROCESS_NAME'" to quit' || true
  sleep 2
fi

# Create backup of existing application
if [ -d "$TARGET_APP" ]; then
  log "Creating backup of existing application"
  BACKUP_PATH="${TARGET_APP}.bak"
  rm -rf "$BACKUP_PATH" 2>/dev/null || true
  cp -R "$TARGET_APP" "$BACKUP_PATH" || true
  log "Backup created at: $BACKUP_PATH"
fi

# Remove existing application
if [ -d "$TARGET_APP" ]; then
  log "Removing existing application"
  rm -rf "$TARGET_APP"
  if [ $? -ne 0 ]; then
    log "ERROR: Failed to remove existing application"
    exit 1
  fi
fi

# Copy new application to target location
log "Copying new application to $TARGET_APP"
mkdir -p "$(dirname "$TARGET_APP")"
cp -R "$APP_PATH" "$TARGET_APP"
if [ $? -ne 0 ]; then
  log "ERROR: Failed to copy new application"
  exit 1
fi

# Fix permissions
log "Setting correct permissions on the application bundle"
find "$TARGET_APP" -type d -exec chmod 755 {} \\;
find "$TARGET_APP" -type f -exec chmod 644 {} \\;
find "$TARGET_APP/Contents/MacOS" -type f -exec chmod 755 {} \\;

# Remove quarantine attribute (critical for avoiding "damaged" message)
log "Removing quarantine attributes"
xattr -rc "$TARGET_APP"

# For extra assurance, explicitly remove common quarantine attributes
xattr -d com.apple.quarantine "$TARGET_APP" 2>/dev/null || true
xattr -d com.apple.macl "$TARGET_APP" 2>/dev/null || true

# Touch the application to update modification time
log "Updating application timestamp"
touch "$TARGET_APP"

# Create the restart script with explicit hardcoded values
RESTART_SCRIPT="${updateLogDir}/restart.sh"
log "Writing restart script with hardcoded values"
cat > "$RESTART_SCRIPT" << EOF
#!/bin/bash
# Restart script for AI Toolbox
# Generated: $(date)

# FIXED: Hardcode the target app path with NO variable substitution
# This prevents "TARGET_APP is not defined" errors
TARGET_APP="/Applications/AI-Toolbox.app"

# Validate TARGET_APP is defined
if [ -z "\$TARGET_APP" ]; then
  echo "Error: TARGET_APP is not defined" > "\${0}.error.log"
  # Fallback to common locations
  if [ -d "/Applications/AI-Toolbox.app" ]; then
    TARGET_APP="/Applications/AI-Toolbox.app"
  elif [ -d "\$HOME/Applications/AI-Toolbox.app" ]; then
    TARGET_APP="\$HOME/Applications/AI-Toolbox.app"
  else
    echo "Error: Could not find application in standard locations" >> "\${0}.error.log"
    exit 1
  fi
fi

# Create a detailed log file
LOG_FILE="\${0}.log"
echo "Restart script started at $(date)" > "\$LOG_FILE"
echo "Target app path: \$TARGET_APP" >> "\$LOG_FILE"

# Delay to ensure app has fully exited
echo "Waiting for app to exit completely..." >> "\$LOG_FILE"
sleep 3

# Last-minute check to ensure quarantine attributes are removed
echo "Removing quarantine attributes" >> "\$LOG_FILE"
xattr -rc "\$TARGET_APP" >> "\$LOG_FILE" 2>&1 || echo "Note: xattr failed, but continuing" >> "\$LOG_FILE"

# Open the application
echo "Opening application at \$TARGET_APP" >> "\$LOG_FILE"
if open "\$TARGET_APP" >> "\$LOG_FILE" 2>&1; then
  echo "Successfully launched application" >> "\$LOG_FILE"
else
  echo "Failed to launch application directly, trying alternate methods" >> "\$LOG_FILE"
  
  # Method 1: Try opening via Finder
  echo "Trying to reveal in Finder" >> "\$LOG_FILE"
  open -R "\$TARGET_APP" >> "\$LOG_FILE" 2>&1
  
  # Method 2: Try launching the executable directly  
  if [ -d "\$TARGET_APP/Contents/MacOS" ]; then
    EXECUTABLE=\$(find "\$TARGET_APP/Contents/MacOS" -type f -perm +111 | head -1)
    if [ -n "\$EXECUTABLE" ]; then
      echo "Trying to launch executable directly: \$EXECUTABLE" >> "\$LOG_FILE"
      "\$EXECUTABLE" >> "\$LOG_FILE" 2>&1 &
    fi
  fi
  
  # Method 3: Use AppleScript as a last resort
  echo "Trying AppleScript" >> "\$LOG_FILE"
  APP_NAME=\$(basename "\$TARGET_APP" .app)
  osascript -e 'tell application "'\$APP_NAME'" to activate' >> "\$LOG_FILE" 2>&1 || true
fi

exit 0
EOF

log "Making restart script executable"
chmod +x "$RESTART_SCRIPT"

log "Installation script complete, exiting with success"
exit 0
`;

    // Write the installation script
    fs.writeFileSync(installScriptPath, installScript);
    fs.chmodSync(installScriptPath, 0o755);
    
    // Progress update
    progressWindow.webContents.send('update-progress', 30, 'Running installation...');
    appendLog('Created installation script, now executing...');
    
    // Execute the installation script
    return new Promise((resolve, reject) => {
      const installProcess = spawn('/bin/bash', [installScriptPath], {
        env: {
          ...process.env,
          PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
          HOME: process.env.HOME
        }
      });
      
      installProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        appendLog(`[stdout] ${message}`);
        
        if (message.includes('Extracting') || message.includes('Mounting')) {
          progressWindow.webContents.send('update-progress', 40, 'Preparing update files...');
        } else if (message.includes('Creating backup')) {
          progressWindow.webContents.send('update-progress', 60, 'Backing up existing application...');
        } else if (message.includes('Removing existing application')) {
          progressWindow.webContents.send('update-progress', 70, 'Removing old version...');
        } else if (message.includes('Copying new application')) {
          progressWindow.webContents.send('update-progress', 80, 'Installing new version...');
        } else if (message.includes('Setting correct permissions')) {
          progressWindow.webContents.send('update-progress', 90, 'Finalizing installation...');
        }
      });
      
      installProcess.stderr.on('data', (data) => {
        appendLog(`[stderr] ${data.toString().trim()}`);
      });
      
      installProcess.on('close', (code) => {
        appendLog(`Installation script exited with code ${code}`);
        
        if (code === 0) {
          progressWindow.webContents.send('update-progress', 100, 'Installation complete! Restarting...');
          appendLog('Installation successful, will restart application');
          
          // Wait a moment before executing restart script
          setTimeout(() => {
            // Execute the restart script
    const restartScriptPath = path.join(updateLogDir, 'restart.sh');
            appendLog(`Executing restart script: ${restartScriptPath}`);
            
            const restartProcess = spawn('/bin/bash', [restartScriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    
            restartProcess.unref();
            
            // Give the restart script a moment to start before quitting
    setTimeout(() => {
              appendLog('Quitting application for restart');
              progressWindow.destroy();
              app.quit();
              resolve(true);
    }, 1000);
          }, 2000);
        } else {
          progressWindow.webContents.send('update-progress', 0, `Installation failed with code ${code}`);
          appendLog(`Installation failed with code ${code}`);
          reject(new Error(`Installation script failed with code ${code}`));
        }
      });
    });
  } catch (error) {
    updaterLogger.error('Error during update installation:', error);
    if (progressWindow) {
      progressWindow.webContents.send('update-progress', 0, `Error: ${error.message}`);
    }
    throw error;
  }
}

// Helper function to safely replace app bundles on macOS
async function performAppReplacement(oldAppPath, newAppPath, targetDir) {
  const { spawn } = require('child_process');
  
  // Get the app name more reliably
  const appBaseName = path.basename(oldAppPath);
  const appName = appBaseName.replace(/\.app$/, ''); // Remove .app extension
  
  // Log what we're doing
  updaterLogger.info(`Replacing ${appBaseName} at ${oldAppPath} with ${path.basename(newAppPath)}`);
  
  // Create a multi-stage script that handles the replacement safely
  const scriptParts = [
    // First try to gracefully quit the app if it's running
    `osascript -e '
    try
      tell application "${appName}" to quit
    end try
    '`,
    
    // Wait a moment to ensure app processes are terminated
    'sleep 2',
    
    // Make a backup of the old app if it exists
    `if [ -d "${oldAppPath}" ]; then 
       echo "Creating backup of existing app..."
       rm -rf "${oldAppPath}.bak" 2>/dev/null || true
       cp -R "${oldAppPath}" "${oldAppPath}.bak" 2>/dev/null || true
     fi`,
    
    // Remove old app with error handling
    `if [ -d "${oldAppPath}" ]; then
       echo "Removing old app bundle..."
       rm -rf "${oldAppPath}" || { echo "Failed to remove old app"; exit 1; }
     fi`,
    
    // Ensure target directory exists
    `mkdir -p "${targetDir}" || { echo "Failed to ensure target directory exists"; exit 1; }`,
    
    // Copy new app into place with verbose output
    `echo "Copying new app bundle..."
     cp -Rv "${newAppPath}" "${targetDir}/" || { echo "Failed to copy new app"; exit 1; }`,
    
    // Set proper permissions
    `echo "Setting permissions..."
     chmod -R 755 "${targetDir}/${path.basename(newAppPath)}" || { echo "Failed to set permissions"; exit 1; }`,
    
    // Clear extended attributes that might be causing macOS security issues
    `echo "Clearing extended attributes..."
     xattr -cr "${targetDir}/${path.basename(newAppPath)}" || { echo "Warning: Failed to clear extended attributes"; }`,
    
    // Try to touch the app to update modification time (helps macOS recognize it as new)
    `touch "${targetDir}/${path.basename(newAppPath)}"`,
    
    // Verify app integrity using macOS codesign
    `echo "Verifying app integrity..."
     codesign --verify --verbose "${targetDir}/${path.basename(newAppPath)}" || { echo "Warning: App verification failed, but continuing"; }`,
    
    // Return success
    'echo "App replaced successfully"'
  ];
  
  // Write the script to a file for debugging and better execution
  const tempDir = app.getPath('temp');
  const scriptPath = path.join(tempDir, 'replace-app.sh');
  fs.writeFileSync(scriptPath, scriptParts.join('\n\n'));
  fs.chmodSync(scriptPath, '755');
  
  updaterLogger.info(`Created replacement script at ${scriptPath}`);
  
  // Execute the script
  return new Promise((resolve, reject) => {
    const proc = spawn('/bin/bash', [scriptPath]);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      updaterLogger.info(`Replacement script output: ${output.trim()}`);
    });
    
    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      updaterLogger.error(`Replacement script error: ${output.trim()}`);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        updaterLogger.info(`App replacement completed successfully`);
        resolve(stdout.trim());
      } else {
        updaterLogger.error(`App replacement failed with code ${code}`);
        reject(new Error(`App replacement failed with code ${code}: ${stderr}`));
      }
    });
  });
}

// Helper function to restart the application
async function restartApplication(appName) {
  const { spawn } = require('child_process');
  
  // Ensure we have the proper app name (without .app extension if it was included)
  const cleanAppName = appName.replace(/\.app$/, '');
  
  updaterLogger.info(`Preparing to restart application: ${cleanAppName}`);
  
  // Create a script file for the restart to ensure it runs after our app quits
  const tempDir = app.getPath('temp');
  const restartScriptPath = path.join(tempDir, 'restart-app.sh');
  
  // More robust restart script with error handling
  const scriptContent = `#!/bin/bash
  # Log file for debugging
  LOG_FILE="${tempDir}/restart-app-log.txt"
  echo "$(date): Starting app restart script" > "$LOG_FILE"
  
  # Wait for app to close
  echo "$(date): Waiting for app to close..." >> "$LOG_FILE"
  sleep 3
  
  # Clear quarantine attribute if it exists (prevents the "app is damaged" message)
  APP_PATH=$(mdfind "kMDItemFSName == '${cleanAppName}.app'" | head -1)
  if [ -n "$APP_PATH" ]; then
    echo "$(date): Clearing quarantine attribute from $APP_PATH" >> "$LOG_FILE"
    xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true
  fi
  
  # Try different methods to restart the app
  echo "$(date): Attempting to restart ${cleanAppName}" >> "$LOG_FILE"
  
  # Method 1: Use open command
  open -a "${cleanAppName}" 2>> "$LOG_FILE" || {
    echo "$(date): First restart attempt failed, trying alternate method" >> "$LOG_FILE"
    
    # Method 2: Try to find the app in Applications folder
    if [ -d "/Applications/${cleanAppName}.app" ]; then
      echo "$(date): Found app in Applications folder, clearing quarantine and opening" >> "$LOG_FILE"
      xattr -d com.apple.quarantine "/Applications/${cleanAppName}.app" 2>/dev/null || true
      open "/Applications/${cleanAppName}.app" 2>> "$LOG_FILE"
    else
      # Method 3: Search for the app
      echo "$(date): Searching for app..." >> "$LOG_FILE"
      APP_PATH=$(mdfind "kMDItemFSName == '${cleanAppName}.app'" | head -1)
      
      if [ -n "$APP_PATH" ]; then
        echo "$(date): Found app at $APP_PATH, clearing quarantine and opening" >> "$LOG_FILE"
        xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true
        open "$APP_PATH" 2>> "$LOG_FILE"
      else
        echo "$(date): Could not find app, restart failed" >> "$LOG_FILE"
      fi
    fi
  }
  
  # Wait to ensure app has time to start
  sleep 5
  
  # Check if app is running
  ps aux | grep -i "${cleanAppName}" | grep -v grep >> "$LOG_FILE"
  
  # Remove this script
  echo "$(date): Removing restart script" >> "$LOG_FILE"
  rm -f "${restartScriptPath}"
  `;
  
  // Write the script to disk
  fs.writeFileSync(restartScriptPath, scriptContent);
  fs.chmodSync(restartScriptPath, '755');
  
  updaterLogger.info(`Created restart script at ${restartScriptPath}`);
  
  // Show a notification dialog with more explanation
  await dialog.showMessageBox({
    type: 'info',
    title: 'Update Successful',
    message: 'The application has been updated successfully and will now restart.',
    detail: 'Please wait a moment while the application restarts with the new version.',
    buttons: ['OK']
  });
  
  // Run the script in the background
  const proc = spawn('/bin/bash', [restartScriptPath], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();
  
  // Now quit this instance
  updaterLogger.info(`Quitting application for restart...`);
  setTimeout(() => {
    app.exit(0); // Ensure clean exit
  }, 1000);
} 

// Add this new function right after the installMacOSUpdate function
async function performManualMacOSUpdate(filePath) {
  const fs = require('fs');
  const { spawn } = require('child_process');
  const path = require('path');
  
  // Create a dedicated log directory
  const updateId = Date.now();
  const tempDir = app.getPath('temp');
  const updateLogDir = path.join(tempDir, `ai-toolbox-update-manual-${updateId}`);
  fs.mkdirSync(updateLogDir, { recursive: true });
  
  const logFilePath = path.join(updateLogDir, 'manual-update.log');
  
  // Helper function to log
  const appendLog = (message) => {
    try {
      fs.appendFileSync(logFilePath, `${new Date().toISOString()}: ${message}\n`);
      console.log(`[Manual Update] ${message}`);
    } catch (err) {
      console.error(`Failed to write to log: ${err.message}`);
    }
  };
  
  appendLog(`Starting manual update from file: ${filePath}`);
  
  // Define hardcoded paths
  const targetAppPath = "/Applications/AI-Toolbox.app";
  const appName = "AI-Toolbox";
  const targetDir = "/Applications";
  
  appendLog(`Using hardcoded application path: ${targetAppPath}`);
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    appendLog(`Update file not found: ${filePath}`);
    throw new Error('Update file not found');
  }
  
  // Create a VERY simple shell script with NO variable substitutions
  const installScriptPath = path.join(updateLogDir, 'manual-install.sh');
  
  // Determine if ZIP or DMG
  const isZip = filePath.toLowerCase().endsWith('.zip');
  const isDmg = filePath.toLowerCase().endsWith('.dmg');
  
  // Create script
  const installScript = `#!/bin/bash
# Manual installation script for AI Toolbox update
# Generated: $(date)

# Set up logging
LOG_FILE="${logFilePath}"
echo "=== Beginning manual installation at $(date) ===" >> "$LOG_FILE"

# Define target path explicitly
TARGET_APP="/Applications/AI-Toolbox.app"
echo "Target app path: $TARGET_APP" >> "$LOG_FILE"

# Extract/mount the update package
echo "Processing file: ${filePath}" >> "$LOG_FILE"

${isZip ? `
# Extract ZIP file
echo "Extracting ZIP file" >> "$LOG_FILE"
TEMP_DIR="${updateLogDir}/extracted"
mkdir -p "$TEMP_DIR"
unzip -o "${filePath}" -d "$TEMP_DIR"

# Find the app in the extracted contents
APP_PATH=$(find "$TEMP_DIR" -name "*.app" -type d -maxdepth 3 | head -1)
` : `
# Mount DMG file
echo "Mounting DMG file" >> "$LOG_FILE"
MOUNT_POINT=$(hdiutil attach "${filePath}" -nobrowse -noautoopen | grep "/Volumes/" | awk '{print $3}')
echo "Mounted at: $MOUNT_POINT" >> "$LOG_FILE"

# Find the app in the mounted DMG
APP_PATH=$(find "$MOUNT_POINT" -name "*.app" -type d -maxdepth 3 | head -1)
`}

# Verify the app was found
if [ -z "$APP_PATH" ]; then
  echo "ERROR: Could not find .app bundle in the update package" >> "$LOG_FILE"
  exit 1
fi

echo "Found application at: $APP_PATH" >> "$LOG_FILE"

# Quit the application if it's running
echo "Attempting to quit running application" >> "$LOG_FILE"
osascript -e 'tell application "AI-Toolbox" to quit' 2>/dev/null || true
sleep 2

# Backup existing app if needed
if [ -d "/Applications/AI-Toolbox.app" ]; then
  echo "Backing up existing application" >> "$LOG_FILE"
  BACKUP_PATH="/Applications/AI-Toolbox.app.bak"
  rm -rf "$BACKUP_PATH" 2>/dev/null || true
  cp -R "/Applications/AI-Toolbox.app" "$BACKUP_PATH" || true
  
  # Remove existing app
  echo "Removing existing application" >> "$LOG_FILE"
  rm -rf "/Applications/AI-Toolbox.app"
fi

# Copy new app to Applications
echo "Installing new application" >> "$LOG_FILE"
cp -R "$APP_PATH" "/Applications/"

# Set permissions
echo "Setting permissions" >> "$LOG_FILE"
find "/Applications/AI-Toolbox.app" -type d -exec chmod 755 {} \\;
find "/Applications/AI-Toolbox.app" -type f -exec chmod 644 {} \\;
find "/Applications/AI-Toolbox.app/Contents/MacOS" -type f -exec chmod 755 {} \\;

# Remove quarantine
echo "Removing quarantine attributes" >> "$LOG_FILE"
xattr -rc "/Applications/AI-Toolbox.app"
xattr -d com.apple.quarantine "/Applications/AI-Toolbox.app" 2>/dev/null || true

# Cleanup
${isDmg ? `
# Unmount DMG
echo "Cleaning up - unmounting DMG" >> "$LOG_FILE"
hdiutil detach "$MOUNT_POINT" -force || true
` : `
# No special cleanup needed for ZIP
echo "Cleanup complete" >> "$LOG_FILE"
`}

# Installation completed
echo "Installation completed successfully" >> "$LOG_FILE"
echo "Launching application" >> "$LOG_FILE"

# Launch the app
open "/Applications/AI-Toolbox.app"

exit 0
`;

  // Write and make executable
  fs.writeFileSync(installScriptPath, installScript);
  fs.chmodSync(installScriptPath, 0o755);
  
  appendLog('Created installation script, now executing...');
  
  // Run the script with admin privileges
  return new Promise((resolve, reject) => {
    // First try running without admin privileges
    const process = spawn('/bin/bash', [installScriptPath], {
      env: {
        ...process.env,
        PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        HOME: process.env.HOME
      }
    });
    
    process.stdout.on('data', (data) => {
      appendLog(`[stdout] ${data.toString().trim()}`);
    });
    
    process.stderr.on('data', (data) => {
      appendLog(`[stderr] ${data.toString().trim()}`);
    });
    
    process.on('close', (code) => {
      appendLog(`Installation script exited with code ${code}`);
      
      if (code === 0) {
        appendLog('Installation successful');
        
        // Wait a moment to ensure the app launches properly
        setTimeout(() => {
          app.quit();
          resolve(true);
        }, 2000);
      } else {
        // If it failed, it might be a permissions issue
        appendLog('Installation failed - might need admin privileges');
        reject(new Error(`Installation script failed with code ${code}`));
      }
    });
  });
}

// Handle quit and install
ipcMain.handle('quit-and-install', async () => {
  updaterLogger.info('Quitting and installing update...');
  
  try {
    // Check if we have a pending update file
    if (global.pendingUpdateFile) {
      updaterLogger.info(`Installing directly downloaded update: ${global.pendingUpdateFile}`);
      
      // Verify the file actually exists
      if (!fs.existsSync(global.pendingUpdateFile)) {
        updaterLogger.error(`ERROR: Pending update file does not exist: ${global.pendingUpdateFile}`);
        return { success: false, error: 'Update file not found' };
      }
      
      // Handle macOS updates
      if (process.platform === 'darwin') {
        try {
          // First try the simplified direct update method with hardcoded paths
          updaterLogger.info(`Starting simplified manual update: ${global.pendingUpdateFile}`);
          try {
            const result = await performManualMacOSUpdate(global.pendingUpdateFile);
            return { success: result };
          } catch (manualErr) {
            updaterLogger.error('Manual update failed, trying standard installer:', manualErr);
            
            // Fall back to the regular installer
            if (global.pendingUpdateFile.toLowerCase().endsWith('.zip')) {
              try {
                const result = await installMacOSUpdate(global.pendingUpdateFile);
                return { success: result };
              } catch (err) {
                autoUpdater.logger.error('All update methods failed:', err);
                
                // If we get a TARGET_APP error, provide a clearer message
                if (err.message && (
                    err.message.includes('TARGET_APP is not defined') || 
                    err.message.includes('Could not determine the application path')
                )) {
                  return { 
                    success: false, 
                    error: 'Could not install the update. Please download the update manually from GitHub and replace the app in your Applications folder.' 
                  };
                }
                
                // Generic error
                return { success: false, error: `Update installation failed: ${err.message}` };
              }
            } else {
              // For DMG files, just use the standard method
              try {
                autoUpdater.quitAndInstall(false, true);
                return { success: true };
              } catch (err) {
                return { success: false, error: `Standard installation failed: ${err.message}` };
              }
            }
          }
        } catch (err) {
          autoUpdater.logger.error('Error during macOS update:', err);
          return { success: false, error: `Update failed: ${err.message}. Please try downloading the update manually from GitHub.` };
        }
      } else {
        // For non-macOS platforms, use standard method
        autoUpdater.logger.info(`Using standard installation for file: ${global.pendingUpdateFile}`);
        try {
          autoUpdater.quitAndInstall(false, true);
          return { success: true };
        } catch (err) {
          autoUpdater.logger.error('Error during standard installation:', err);
          return { success: false, error: 'Standard update installation failed. Please try downloading the update manually from GitHub.' };
        }
      }
    } else {
      // Check if autoUpdater has a downloaded update
      try {
        // Log the current state of the updater
        autoUpdater.logger.info('No pendingUpdateFile found, checking if autoUpdater has downloaded update');
        
        // Use standard method if no pending update file
        autoUpdater.logger.info('Using standard quitAndInstall method');
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
      } catch (err) {
        autoUpdater.logger.error('Error during quitAndInstall:', err);
        return { success: false, error: `Update installation failed: ${err.message}. Please try downloading the update manually from GitHub.` };
      }
    }
  } catch (err) {
    autoUpdater.logger.error('Unexpected error during update installation:', err);
    return { success: false, error: `Unexpected error: ${err.message}. Please try downloading the update manually from GitHub.` };
  }
});

// Helper function to download a file to the Downloads folder
async function downloadToDownloadsFolder(url, filename) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Get Downloads folder path
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const filePath = path.join(downloadsPath, filename);
    
    console.log(`Downloading to: ${filePath}`);
    
    // Better handling of redirects
    const fetchWithRedirects = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }
      
      console.log(`Request attempt ${redirectCount + 1} for: ${currentUrl}`);
      
      // Parse the URL
      let parsedUrl;
      try {
        parsedUrl = new URL(currentUrl);
      } catch (error) {
        return reject(new Error(`Invalid URL: ${currentUrl} - ${error.message}`));
      }
      
      // Choose http or https module
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;
      
      // Make the request
      const req = requestModule.get(currentUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirect (${res.statusCode}) to: ${res.headers.location}`);
          
          // Construct absolute URL if relative
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            // Handle relative URLs
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            } else {
              redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.replace(/\/[^\/]*$/, '/')}${redirectUrl}`;
            }
          }
          
          console.log(`Following redirect to: ${redirectUrl}`);
          
          // Need a slight delay to avoid overwhelming the server with too many redirects
          setTimeout(() => {
            fetchWithRedirects(redirectUrl, redirectCount + 1);
          }, 100);
          return;
        }
        
        // Handle errors
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download: ${res.statusCode} ${res.statusMessage}`));
        }
        
        // Log file size if available
        const contentLength = res.headers['content-length'];
        if (contentLength) {
          console.log(`File size: ${parseInt(contentLength, 10)} bytes`);
        }
        
        // Create file stream
        const file = fs.createWriteStream(filePath);
        
        // Pipe the response directly to the file
        res.pipe(file);
        
        // Listen for errors on the file
        file.on('error', (err) => {
          // Clean up and reject
          file.close();
          fs.unlink(filePath, () => {});
          reject(new Error(`File write error: ${err.message}`));
        });
        
        // Listen for the finish event
        file.on('finish', () => {
          file.close();
          
          // Verify the file exists and has content
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              fs.unlink(filePath, () => {});
              reject(new Error('Downloaded file is empty'));
            } else {
              console.log(`Downloaded ${stats.size} bytes to ${filePath}`);
              resolve(filePath);
            }
          } catch (err) {
            reject(new Error(`Error verifying downloaded file: ${err.message}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (err) => {
        console.error(`Request error: ${err.message}`);
        fs.unlink(filePath, () => {});
        reject(new Error(`Request error: ${err.message}`));
      });
      
      // Set timeout
      req.setTimeout(30000, () => {
        console.error('Request timed out');
        req.abort();
        fs.unlink(filePath, () => {});
        reject(new Error('Request timed out'));
      });
    };
    
    // Start the download process
    fetchWithRedirects(url, 0);
  });
}

// Simple version comparison function
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0; // Versions are equal
}

// Replace the setupUpdateHandlers function
function setupUpdateHandlers() {
  console.log('Setting up update handlers with version:', global.APP_VERSION);

  // Register all the IPC handlers for updates
  ipcMain.handle('check-for-simple-updates', async () => {
    try {
      const result = await checkForSimpleUpdates();
      return result;
    } catch (error) {
      console.error('Error in check-for-simple-updates handler:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download-update', async (event, version) => {
    try {
      console.log(`Download update requested for ${version || 'latest'}`);
      const filePath = await downloadUpdateToDownloads(version);
      
      // Notify renderer process
      mainWindow?.webContents.send('update-downloaded', {
        version: version || global.APP_VERSION,
        filePath: filePath
      });
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error in download-update handler:', error);
      mainWindow?.webContents.send('update-error', { message: error.message });
      return { success: false, error: error.message };
    }
  });
  
  // Remove the duplicate get-app-version handler from this function
  // It's already defined in the main IPC setup
}
