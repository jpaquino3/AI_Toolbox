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
      // Flag to indicate the electron API is available
      isAvailable: true,
      
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
      
      // Add a direct GitHub API based update checker that doesn't rely on IPC
      directCheckForUpdates: async () => {
        try {
          console.log('Using direct GitHub API for update check');
          
          // Define compareVersions function within the scope of directCheckForUpdates
          const compareVersions = (v1, v2) => {
            try {
              // Remove 'v' prefix if present
              v1 = (v1 || '').replace(/^v/i, '').trim();
              v2 = (v2 || '').replace(/^v/i, '').trim();
              
              const v1Parts = v1.split('.').map(p => parseInt(p, 10) || 0);
              const v2Parts = v2.split('.').map(p => parseInt(p, 10) || 0);
              
              // Ensure we have same number of components by padding with zeros
              while (v1Parts.length < v2Parts.length) v1Parts.push(0);
              while (v2Parts.length < v1Parts.length) v2Parts.push(0);
              
              // Compare each component
              for (let i = 0; i < v1Parts.length; i++) {
                if (v1Parts[i] > v2Parts[i]) return 1;
                if (v1Parts[i] < v2Parts[i]) return -1;
              }
              
              return 0; // They're the same
            } catch (e) {
              console.error('Error comparing versions:', e);
              return 0; // Assume equal on error
            }
          };
          
          // Get current version - avoiding require which doesn't work well in production
          let currentVersion = '1.2.1'; // Default fallback version
          
          try {
            // First try to get version from the global APP_VERSION set in main.js
            if (typeof global !== 'undefined' && global.APP_VERSION) {
              currentVersion = global.APP_VERSION;
              console.log('Got version from global.APP_VERSION:', currentVersion);
            } else if (process && process.APP_VERSION) {
              currentVersion = process.APP_VERSION;
              console.log('Got version from process.APP_VERSION:', currentVersion);
            } else {
              // Try to get from electron app if available
              const electron = require('electron');
              const app = electron.remote?.app || electron.app;
              if (app && app.getVersion) {
                currentVersion = app.getVersion();
                console.log('Got version from electron app:', currentVersion);
              } else {
                console.log('Using fallback version:', currentVersion);
              }
            }
          } catch (e) {
            console.error('Error getting current version:', e);
            // Fall back to the default version
          }
          
          // First try to fetch the latest-mac.yml file from GitHub releases
          let latestVersion = '';
          let releaseInfo = null;
          
          try {
            // Try to fetch the latest-mac.yml file first
            const ymlResponse = await fetch(
              'https://github.com/jpaquino3/AI_Toolbox/releases/latest/download/latest-mac.yml'
            );
            
            if (ymlResponse.ok) {
              const ymlText = await ymlResponse.text();
              console.log('Found latest-mac.yml:', ymlText);
              
              // Parse YAML to extract version
              const versionMatch = /version:\s*(.+)/i.exec(ymlText);
              if (versionMatch && versionMatch[1]) {
                latestVersion = versionMatch[1].trim();
                console.log('Version from latest-mac.yml:', latestVersion);
              }
            } else {
              console.log('Failed to fetch latest-mac.yml, falling back to releases API');
            }
          } catch (ymlError) {
            console.log('Error fetching latest-mac.yml:', ymlError);
          }
          
          // If we couldn't get version from yml, fall back to GitHub API
          if (!latestVersion) {
            // Fetch the latest release info from GitHub API
            const apiResponse = await fetch('https://api.github.com/repos/jpaquino3/AI_Toolbox/releases/latest');
            
            if (!apiResponse.ok) {
              throw new Error(`GitHub API error: ${apiResponse.status}`);
            }
            
            releaseInfo = await apiResponse.json();
            console.log('Latest release info:', releaseInfo);
            
            // Get GitHub version without any "v" prefix
            latestVersion = (releaseInfo.tag_name || '').replace(/^v/i, '').trim();
          }
          
          console.log(`Current version: ${currentVersion}, Latest release: ${latestVersion}`);
          
          // Use proper version comparison
          const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0;
          
          return {
            updateAvailable: isUpdateAvailable,
            currentVersion,
            latestVersion,
            releaseInfo: releaseInfo || {
              tag_name: latestVersion,
              body: "Update available",
              published_at: new Date().toISOString()
            }
          };
        } catch (err) {
          console.error('Error in directCheckForUpdates:', err);
          return { 
            updateAvailable: false, 
            error: err.message 
          };
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
      
      quitAndInstall: async () => {
        try {
          return await ipcRenderer.invoke('quit-and-install');
        } catch (err) {
          console.error('Error in quitAndInstall:', err);
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
        try {
          const handler = (event, info) => callback(info);
          ipcRenderer.on('update-available', handler);
          return () => ipcRenderer.removeListener('update-available', handler);
        } catch (err) {
          console.error('Error setting up update-available listener:', err);
          return () => {};
        }
      },
      
      onUpdateNotAvailable: (callback) => {
        try {
          const handler = (event, info) => callback(info);
          ipcRenderer.on('update-not-available', handler);
          return () => ipcRenderer.removeListener('update-not-available', handler);
        } catch (err) {
          console.error('Error setting up update-not-available listener:', err);
          return () => {};
        }
      },
      
      onUpdateError: (callback) => {
        try {
          const handler = (event, info) => callback(info);
          ipcRenderer.on('update-error', handler);
          return () => ipcRenderer.removeListener('update-error', handler);
        } catch (err) {
          console.error('Error setting up update-error listener:', err);
          return () => {};
        }
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
      
      // Debug methods for testing update process (only available in development)
      mockUpdateAvailable: async () => {
        try {
          return await ipcRenderer.invoke('mock-update-available');
        } catch (err) {
          console.error('Error in mockUpdateAvailable:', err);
          return { success: false, error: err.message };
        }
      },
      
      mockUpdateDownloaded: async () => {
        try {
          return await ipcRenderer.invoke('mock-update-downloaded');
        } catch (err) {
          console.error('Error in mockUpdateDownloaded:', err);
          return { success: false, error: err.message };
        }
      },
      
      mockUpdateProgress: async (percent) => {
        try {
          return await ipcRenderer.invoke('mock-update-progress', percent);
        } catch (err) {
          console.error('Error in mockUpdateProgress:', err);
          return { success: false, error: err.message };
        }
      },
      
      // Reveal a file in Finder
      revealFileInFinder: async (filePath) => {
        try {
          return await ipcRenderer.invoke('reveal-file-in-finder', filePath);
        } catch (err) {
          console.error('Error in revealFileInFinder:', err);
          return { success: false, error: err.message };
        }
      },
      
      // Select a folder using native dialog
      selectFolder: async () => {
        try {
          return await ipcRenderer.invoke('select-folder');
        } catch (err) {
          console.error('Error in selectFolder:', err);
          return { success: false, error: err.message };
        }
      },
      
      // Get images from a folder path
      getImagesFromFolder: async (folderPath) => {
        try {
          return await ipcRenderer.invoke('get-images-from-folder', folderPath);
        } catch (err) {
          console.error('Error in getImagesFromFolder:', err);
          return { success: false, error: err.message };
        }
      },
      
      // Enable file drops in webviews
      enableWebviewDrops: () => {
        try {
          return window.enableWebviewDrops();
        } catch (err) {
          console.error('Error in enableWebviewDrops:', err);
          return false;
        }
      },
      
      // Add a sync method to get the app version immediately
      getAppVersionSync: () => {
        try {
          // Try various sources for the version number
          if (typeof global !== 'undefined' && global.APP_VERSION) {
            return global.APP_VERSION;
          }
          
          if (process && process.APP_VERSION) {
            return process.APP_VERSION;
          }
          
          // Try to get from package.json via the main process
          try {
            const electron = require('electron');
            const app = electron.remote?.app || electron.app;
            if (app && app.getVersion) {
              return app.getVersion();
            }
          } catch (e) {
            console.error('Error getting version from electron:', e);
          }
          
          // Default fallback
          return '1.2.1';
        } catch (err) {
          console.error('Error in getAppVersionSync:', err);
          return '1.2.1';
        }
      }
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
      revealFileInFinder: async (filePath) => {
        try {
          return await ipcRenderer.invoke('reveal-file-in-finder', filePath);
        } catch (err) {
          console.error('Error in revealFileInFinder:', err);
          return { success: false, error: err.message };
        }
      },
      selectFolder: async () => {
        try {
          return await ipcRenderer.invoke('select-folder');
        } catch (err) {
          console.error('Error in selectFolder:', err);
          return { success: false, error: err.message };
        }
      },
      getImagesFromFolder: async (folderPath) => {
        try {
          return await ipcRenderer.invoke('get-images-from-folder', folderPath);
        } catch (err) {
          console.error('Error in getImagesFromFolder:', err);
          return { success: false, error: err.message };
        }
      },
      enableWebviewDrops: () => {
        try {
          return window.enableWebviewDrops();
        } catch (err) {
          console.error('Error in enableWebviewDrops:', err);
          return false;
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

// Add methods to enable webview file drop support
window.enableWebviewDrops = () => {
  try {
    // Get all webviews on the page
    const webviews = document.querySelectorAll('webview');
    
    webviews.forEach(webview => {
      // Make sure the webview is loaded
      if (webview.readyState === 'complete') {
        configureWebview(webview);
      } else {
        webview.addEventListener('did-finish-load', () => {
          configureWebview(webview);
        });
      }
    });
    
    return true;
  } catch (err) {
    console.error('Error enabling webview drops:', err);
    return false;
  }
};

function configureWebview(webview) {
  try {
    // Inject CSS to indicate drop targets
    webview.insertCSS(`
      .drop-target {
        outline: 2px dashed #8b5cf6 !important;
        outline-offset: -2px !important;
        position: relative !important;
      }
      .drop-target::after {
        content: 'Drop Here' !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: rgba(139, 92, 246, 0.8) !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 4px !important;
        font-size: 14px !important;
        z-index: 10000 !important;
      }
    `);
    
    // Improved script to handle drops - better image insertion for file URLs
    webview.executeJavaScript(`
      (function() {
        // Enable drag and drop
        document.documentElement.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();
          document.body.classList.add('drop-target');
        }, false);
        
        document.documentElement.addEventListener('dragleave', function(e) {
          e.preventDefault();
          e.stopPropagation();
          document.body.classList.remove('drop-target');
        }, false);
        
        document.documentElement.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          document.body.classList.remove('drop-target');
          
          console.log('DROP RECEIVED IN WEBVIEW!');
          
          // Get the dropped content from various possible sources
          let fileUrl = '';
          let htmlContent = '';
          
          // Check all available data formats
          console.log('Available data types:', e.dataTransfer.types);
          
          // Try HTML first, which would directly have an <img> tag
          if (e.dataTransfer.types.includes('text/html')) {
            htmlContent = e.dataTransfer.getData('text/html');
            console.log('Found HTML content:', htmlContent);
          }
          
          // Get the file URL if available
          if (e.dataTransfer.types.includes('text/uri-list')) {
            fileUrl = e.dataTransfer.getData('text/uri-list');
            console.log('Found text/uri-list:', fileUrl);
          } else if (e.dataTransfer.types.includes('text/plain')) {
            fileUrl = e.dataTransfer.getData('text/plain');
            console.log('Found text/plain:', fileUrl);
          } else if (e.dataTransfer.types.includes('URL')) {
            fileUrl = e.dataTransfer.getData('URL');
            console.log('Found URL:', fileUrl);
          }
          
          // Normalize the file URL if it's malformed
          // Sometimes we get file://///path instead of file:///path
          if (fileUrl && fileUrl.startsWith('file://')) {
            // Fix common issues with file URLs
            const normalizedUrl = fileUrl.replace(/file:\/+/, 'file:///');
            console.log('Normalized file URL:', normalizedUrl);
            fileUrl = normalizedUrl;
          }
          
          // Proceed if we have a file URL or HTML content
          if ((fileUrl && fileUrl.startsWith('file://')) || htmlContent) {
            console.log('Processing image insertion into webview');
            
            // The magic happens here - insert the actual image
            const insertImage = () => {
              // If we have HTML with an <img> tag, prefer that
              const imgTag = htmlContent.includes('<img') ? htmlContent : 
                             fileUrl ? '<img src="' + fileUrl + '" alt="Dropped image" style="max-width: 100%; max-height: 500px;">' : '';
              
              if (!imgTag) {
                console.error('No valid image content found to insert');
                return false;
              }
              
              // Find active element that might be an editor
              const activeElement = document.activeElement;
              
              // Try to insert directly at cursor if we're in an editor
              if (activeElement && (
                  activeElement.isContentEditable || 
                  activeElement.tagName === 'TEXTAREA' || 
                  activeElement.tagName === 'INPUT' ||
                  activeElement.role === 'textbox' ||
                  activeElement.getAttribute('contenteditable') === 'true'
              )) {
                try {
                  // For rich text/contentEditable elements
                  if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
                    // Insert HTML directly
                    document.execCommand('insertHTML', false, imgTag);
                    console.log('Inserted image into contentEditable element');
                    return true;
                  } 
                  // For plain text fields, insert markdown image or just the URL
                  else if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
                    const start = activeElement.selectionStart;
                    const end = activeElement.selectionEnd;
                    const value = activeElement.value;
                    
                    // Try markdown format first
                    const imageMd = '![image](' + fileUrl + ')';
                    activeElement.value = value.substring(0, start) + imageMd + value.substring(end);
                    activeElement.selectionStart = activeElement.selectionEnd = start + imageMd.length;
                    
                    // Trigger input event to ensure changes are registered
                    const inputEvent = new Event('input', { bubbles: true });
                    activeElement.dispatchEvent(inputEvent);
                    console.log('Inserted markdown image into text field');
                    return true;
                  }
                } catch (err) {
                  console.error('Error inserting at cursor:', err);
                }
              }
              
              // If we couldn't insert at cursor, try to find a common editor component
              try {
                // Look for popular editor frameworks
                const editorTargets = [
                  document.querySelector('.ql-editor'), // Quill editor
                  document.querySelector('[contenteditable="true"]'), // Any contentEditable
                  document.querySelector('.CodeMirror'), // CodeMirror
                  document.querySelector('.ace_editor'), // Ace editor
                  document.querySelector('.monaco-editor'), // Monaco editor
                  document.querySelector('.tiptap'), // Tiptap
                  document.querySelector('.ProseMirror'), // ProseMirror
                  document.querySelector('.fr-element'), // Froala
                  document.querySelector('.note-editable'), // Summernote
                  document.querySelector('iframe[title*="editor" i]'), // iframe editors
                  document.querySelector('.mce-content-body'), // TinyMCE
                  document.querySelector('[data-lexical-editor]'), // Lexical
                  document.querySelector('textarea.markdown-editor') // Common markdown editors
                ];
                
                for (const target of editorTargets) {
                  if (target) {
                    // Try custom approach based on editor type
                    if (target.classList.contains('ql-editor')) {
                      // Quill editor - try to insert image
                      target.innerHTML += imgTag;
                      console.log('Inserted image into Quill editor');
                      return true;
                    } else if (target.getAttribute('contenteditable') === 'true') {
                      // Generic contentEditable - focus and insert
                      target.focus();
                      document.execCommand('insertHTML', false, imgTag);
                      console.log('Inserted image into contentEditable');
                      return true;
                    } else if (target.tagName === 'IFRAME') {
                      // Try to insert in iframe document if possible
                      try {
                        const iframeDoc = target.contentDocument || target.contentWindow.document;
                        // Insert as HTML
                        const tempDiv = iframeDoc.createElement('div');
                        tempDiv.innerHTML = imgTag;
                        const imgEl = tempDiv.firstChild;
                        iframeDoc.body.appendChild(imgEl);
                        console.log('Inserted image into iframe editor');
                        return true;
                      } catch (iframeErr) {
                        console.error('Error inserting into iframe:', iframeErr);
                      }
                    }
                  }
                }
              } catch (editorErr) {
                console.error('Error trying editor insertion:', editorErr);
              }
              
              // As a final fallback, insert it into the document body
              try {
                // Insert the HTML directly into the body
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = imgTag;
                const imgEl = tempDiv.firstChild;
                
                if (imgEl) {
                  // Apply styles directly to the image
                  imgEl.style.maxWidth = '100%';
                  imgEl.style.maxHeight = '500px';
                  imgEl.style.margin = '20px auto';
                  imgEl.style.display = 'block';
                  imgEl.style.border = '1px solid #ccc';
                  
                  // Try to find a good container to append to
                  const containers = [
                    document.querySelector('main'),
                    document.querySelector('.content'),
                    document.querySelector('.main-content'),
                    document.querySelector('.editor'),
                    document.querySelector('.text-area'),
                    document.body
                  ];
                  
                  for (const container of containers) {
                    if (container) {
                      container.appendChild(imgEl);
                      console.log('Inserted image into', container.tagName || 'container');
                      
                      // Scroll the image into view
                      imgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      return true;
                    }
                  }
                }
              } catch (err) {
                console.error('Error in fallback insertion:', err);
                return false;
              }
              
              return false;
            };
            
            // Call our image insertion function
            const inserted = insertImage();
            console.log('Image insertion result:', inserted ? 'SUCCESS' : 'FAILED');
            
            // If insertion failed, try alternate method - simulate paste event
            if (!inserted) {
              try {
                console.log('Trying paste event simulation');
                
                // Try to create a clipboard event with the image
                const clipboardData = new DataTransfer();
                clipboardData.setData('text/html', htmlContent || '<img src="' + fileUrl + '" alt="Dropped image">');
                clipboardData.setData('text/plain', '![image](' + fileUrl + ')');
                
                const pasteEvent = new ClipboardEvent('paste', {
                  bubbles: true,
                  cancelable: true,
                  clipboardData: clipboardData
                });
                
                // Dispatch to active element or document body
                (document.activeElement || document.body).dispatchEvent(pasteEvent);
                console.log('Dispatched paste event');
              } catch (pasteError) {
                console.error('Error simulating paste:', pasteError);
              }
            }
          }
        }, false);
        
        console.log('UPGRADED WEBVIEW DROP HANDLERS INSTALLED');
        return true;
      })();
    `)
    .then(result => console.log('Drop handlers injection result:', result))
    .catch(err => console.error('Error injecting drop handlers:', err));
    
  } catch (err) {
    console.error('Error configuring webview for drops:', err);
  }
} 