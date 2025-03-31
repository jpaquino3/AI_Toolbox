// Preload script for Electron
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded in preload script');
  
  // Log any errors that might be causing white screen
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
  });

  // Print a message for debugging
  console.log('React app environment:', process.env.NODE_ENV);
  
  // Create a global variable to check if Electron API is available
  window.isElectronAvailable = true;
});

// Expose a 'ping' function that we can call from DevTools to check if preload is loaded
window.electronPing = () => {
  console.log('Electron preload is loaded!');
  return 'pong';
};

const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executing - setting up contextBridge');

// Make sure to call contextBridge.exposeInMainWorld with a try-catch to avoid crashes
try {
  // Expose protected methods that allow the renderer process to use IPC
  contextBridge.exposeInMainWorld(
    'electron',
    {
      // API to register/unregister keyboard shortcuts
      registerShortcut: (shortcut) => {
        ipcRenderer.send('register-shortcut', shortcut);
      },
      unregisterShortcuts: () => {
        ipcRenderer.send('unregister-shortcuts');
      },
      onShortcut: (shortcut, callback) => {
        ipcRenderer.on(`shortcut-${shortcut}`, callback);
      },
      
      // New API for app-level keybindings that override browser shortcuts
      registerAppKeybinding: (keybinding) => {
        try {
          if (typeof keybinding === 'string') {
            ipcRenderer.send('register-app-keybinding', keybinding);
          } else {
            console.error('Invalid keybinding format:', keybinding);
          }
        } catch (err) {
          console.error('Error in registerAppKeybinding:', err);
        }
      },
      registerAppKeybindings: (keybindings) => {
        try {
          ipcRenderer.send('register-app-keybindings', keybindings);
        } catch (err) {
          console.error('Error in registerAppKeybindings:', err);
        }
      },
      getAppKeybindings: async () => {
        try {
          return await ipcRenderer.invoke('get-app-keybindings');
        } catch (err) {
          console.error('Error in getAppKeybindings:', err);
          return [];
        }
      },
      onAppKeybindingTriggered: (callback) => {
        try {
          const handler = (event, keyCombo) => {
            try {
              callback(keyCombo);
            } catch (err) {
              console.error('Error in keybinding callback:', err);
            }
          };
          
          ipcRenderer.on('app-keybinding-triggered', handler);
          
          // Return a function to remove the listener
          return () => {
            try {
              ipcRenderer.removeListener('app-keybinding-triggered', handler);
            } catch (err) {
              console.error('Error removing keybinding listener:', err);
            }
          };
        } catch (err) {
          console.error('Error setting up keybinding listener:', err);
          return () => {}; // Return empty cleanup function
        }
      },
      onAppKeybindingsUpdated: (callback) => {
        try {
          const handler = (event, keybindings) => {
            try {
              callback(keybindings);
            } catch (err) {
              console.error('Error in keybindings updated callback:', err);
            }
          };
          
          ipcRenderer.on('app-keybindings-updated', handler);
          
          // Return a function to remove the listener
          return () => {
            try {
              ipcRenderer.removeListener('app-keybindings-updated', handler);
            } catch (err) {
              console.error('Error removing keybindings updated listener:', err);
            }
          };
        } catch (err) {
          console.error('Error setting up keybindings updated listener:', err);
          return () => {}; // Return empty cleanup function
        }
      },
      
      // API Key management
      storeApiKey: (provider, key) => {
        ipcRenderer.send('store-api-key', { provider, key });
      },
      getApiKey: (provider) => {
        return ipcRenderer.invoke('get-api-key', provider);
      },
      
      // Cookie management API
      getAllCookies: async () => {
        try {
          return await ipcRenderer.invoke('get-all-cookies');
        } catch (err) {
          console.error('Error in getAllCookies:', err);
          return [];
        }
      },
      
      getDomainCookies: async (domain) => {
        try {
          return await ipcRenderer.invoke('get-domain-cookies', domain);
        } catch (err) {
          console.error(`Error in getDomainCookies for ${domain}:`, err);
          return [];
        }
      },
      
      clearAllCookies: async () => {
        try {
          return await ipcRenderer.invoke('clear-cookies');
        } catch (err) {
          console.error('Error in clearAllCookies:', err);
          return { success: false, error: err.message };
        }
      },
      
      clearDomainCookies: async (domain) => {
        try {
          return await ipcRenderer.invoke('clear-cookies', domain);
        } catch (err) {
          console.error(`Error in clearDomainCookies for ${domain}:`, err);
          return { success: false, error: err.message };
        }
      },
      
      getCookiesForDomains: async (domains) => {
        try {
          return await ipcRenderer.invoke('get-cookies-for-domains', domains);
        } catch (err) {
          console.error('Error in getCookiesForDomains:', err);
          return {};
        }
      },
      
      clearToolData: async (toolId) => {
        try {
          console.log(`Preload: Invoking clear-tool-data for ${toolId}`);
          const result = await ipcRenderer.invoke('clear-tool-data', toolId);
          console.log(`Preload: clear-tool-data result:`, result);
          return result;
        } catch (err) {
          console.error(`Error in clearToolData for ${toolId}:`, err);
          return { success: false, error: err.message };
        }
      },
      
      // Add a simple test method to verify IPC is working
      testIpc: () => {
        try {
          console.log('Preload: Testing IPC connection');
          return { success: true, message: 'IPC connection working' };
        } catch (err) {
          console.error('IPC test failed:', err);
          return { success: false, error: err.message };
        }
      },
      
      // Add app update related functions
      checkForUpdates: async () => {
        try {
          return await ipcRenderer.invoke('check-for-updates');
        } catch (err) {
          console.error('Error in checkForUpdates:', err);
          return { error: err.message };
        }
      },
      
      downloadUpdate: async () => {
        try {
          return await ipcRenderer.invoke('download-update');
        } catch (err) {
          console.error('Error in downloadUpdate:', err);
          return { success: false, error: err.message };
        }
      },
      
      getAppVersion: async () => {
        try {
          return await ipcRenderer.invoke('get-app-version');
        } catch (err) {
          console.error('Error in getAppVersion:', err);
          return { error: err.message };
        }
      },
      
      onUpdateAvailable: (callback) => {
        const handler = (event, info) => callback(info);
        ipcRenderer.on('update-available', handler);
        return () => ipcRenderer.removeListener('update-available', handler);
      },
      
      onUpdateNotAvailable: (callback) => {
        const handler = (event, info) => callback(info);
        ipcRenderer.on('update-not-available', handler);
        return () => ipcRenderer.removeListener('update-not-available', handler);
      },
      
      onUpdateError: (callback) => {
        const handler = (event, info) => callback(info);
        ipcRenderer.on('update-error', handler);
        return () => ipcRenderer.removeListener('update-error', handler);
      },
      
      onDownloadProgress: (callback) => {
        const handler = (event, progressObj) => callback(progressObj);
        ipcRenderer.on('download-progress', handler);
        return () => ipcRenderer.removeListener('download-progress', handler);
      },
      
      onUpdateDownloaded: (callback) => {
        const handler = (event, info) => callback(info);
        ipcRenderer.on('update-downloaded', handler);
        return () => ipcRenderer.removeListener('update-downloaded', handler);
      },
      
      // Add a simple property to check if Electron is available
      isAvailable: true
    }
  );
  console.log('Successfully exposed Electron API via contextBridge');
} catch (error) {
  console.error('Failed to expose Electron API via contextBridge:', error);
  
  // If contextBridge fails, try to expose the API directly to the window object (as fallback)
  try {
    console.log('Attempting to expose Electron API directly to window object');
    window.electron = {
      clearToolData: async (toolId) => {
        try {
          return await ipcRenderer.invoke('clear-tool-data', toolId);
        } catch (err) {
          console.error(`Error in direct clearToolData for ${toolId}:`, err);
          return { success: false, error: err.message };
        }
      },
      testIpc: () => ({ success: true, message: 'Direct window API working' }),
      isAvailable: true
    };
    console.log('Successfully exposed Electron API directly to window object');
  } catch (windowError) {
    console.error('Failed to expose Electron API directly:', windowError);
  }
} 