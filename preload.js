// Preload script for Electron
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded in preload script');
  
  // Log any errors that might be causing white screen
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
  });

  // Print a message for debugging
  console.log('React app environment:', process.env.NODE_ENV);
});

// Expose a 'ping' function that we can call from DevTools to check if preload is loaded
window.electronPing = () => {
  console.log('Electron preload is loaded!');
  return 'pong';
};

const { contextBridge, ipcRenderer } = require('electron');

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
    }
  }
); 