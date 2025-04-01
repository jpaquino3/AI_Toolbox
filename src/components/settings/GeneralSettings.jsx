import React, { useState, useEffect } from 'react';

// Try to get app version synchronously if possible
const getInitialVersion = () => {
  if (typeof window !== 'undefined' && window.electron && window.electron.getAppVersionSync) {
    try {
      return window.electron.getAppVersionSync();
    } catch (e) {
      console.error('Error getting version synchronously:', e);
    }
  }
  return '1.2.1'; // Default fallback
};

const GeneralSettings = ({ showMessage, isElectron }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(getInitialVersion);
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [ipcAvailable, setIpcAvailable] = useState(false);

  useEffect(() => {
    // Load dark mode setting
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Get app version (electron only)
    if (isElectron) {
      let retryCount = 0;
      const maxRetries = 5;
      
      // Try to detect IPC availability immediately
      const checkIpcAvailability = () => {
        if (window.electron && 
            (window.electron.testIpc || 
             window.electron.getAppVersion || 
             window.electron.checkForUpdates || 
             window.electron.directCheckForUpdates)) {
          console.log('IPC appears to be available');
          setIpcAvailable(true);
          return true;
        }
        console.log('IPC does not appear to be available');
        setIpcAvailable(false);
        return false;
      };
      
      // Check IPC availability immediately
      checkIpcAvailability();
      
      const setupListeners = () => {
        // First, validate that we have access to the electron API
        if (!window.electron) {
          console.log('Electron API not available');
          setUpdateError('IPC not available');
          return false;
        }

        console.log('Setting up update event listeners');
        
        // Attempt to get app version without waiting for a response
        getAppVersion().catch(err => {
          console.error('Error getting app version:', err);
        });
        
        // Set up event listeners for updates
        const removeAvailableListener = window.electron.onUpdateAvailable 
          ? window.electron.onUpdateAvailable((info) => {
              console.log('Update available event received:', info);
              setUpdateStatus('available');
              setUpdateInfo(info);
            })
          : null;
        
        const removeNotAvailableListener = window.electron.onUpdateNotAvailable
          ? window.electron.onUpdateNotAvailable(() => {
              console.log('Update not available event received');
              setUpdateStatus('not-available');
            })
          : null;
        
        const removeDownloadedListener = window.electron.ipcRenderer?.on
          ? window.electron.ipcRenderer.on('update-downloaded', () => {
              console.log('Update downloaded event received');
              setUpdateStatus('downloaded');
            })
          : null;
        
        const removeErrorListener = window.electron.onUpdateError
          ? window.electron.onUpdateError((error) => {
              console.log('Update error event received:', error);
              setUpdateStatus('error');
              setUpdateError(error.message || 'Unknown error');
            })
          : null;
        
        if (window.electron.ipcRenderer?.on) {
          window.electron.ipcRenderer.on('download-progress', (progressObj) => {
            console.log('Download progress event received:', progressObj);
            setUpdateProgress(progressObj.percent || 0);
          });
        }
        
        // Store cleanup functions
        const cleanupListeners = () => {
          if (removeAvailableListener) removeAvailableListener();
          if (removeNotAvailableListener) removeNotAvailableListener();
          if (removeDownloadedListener) removeDownloadedListener();
          if (removeErrorListener) removeErrorListener();
          
          if (window.electron?.ipcRenderer?.removeAllListeners) {
            window.electron.ipcRenderer.removeAllListeners('update-downloaded');
            window.electron.ipcRenderer.removeAllListeners('download-progress');
          }
        };
        
        // Add cleanup function to effect return
        return cleanupListeners;
      };
      
      // Try to set up listeners immediately
      const cleanup = setupListeners();
      
      // If not successful, retry with increasing delays
      let retryTimer = null;
      if (!cleanup && retryCount < maxRetries) {
        const attemptSetup = () => {
          retryCount++;
          console.log(`Attempting to set up IPC listeners (attempt ${retryCount}/${maxRetries})`);
          
          const result = setupListeners();
          if (result) {
            console.log('Successfully set up IPC listeners on retry');
            clearTimeout(retryTimer);
          } else if (retryCount < maxRetries) {
            // Exponential backoff: 500ms, 1000ms, 2000ms, etc.
            const delay = Math.min(500 * Math.pow(2, retryCount - 1), 10000);
            retryTimer = setTimeout(attemptSetup, delay);
          } else {
            console.error('Failed to set up IPC listeners after maximum retries');
            setUpdateError('IPC not available after multiple attempts');
            
            // As a fallback, try direct GitHub API check
            directCheckForUpdates();
          }
        };
        
        retryTimer = setTimeout(attemptSetup, 500);
      }
      
      // Clean up listeners and timers
      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
        
        if (retryTimer) {
          clearTimeout(retryTimer);
        }
      };
    }
  }, [isElectron]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    document.body.classList.toggle('dark-mode', newMode);
    showMessage(`${newMode ? 'Dark' : 'Light'} mode enabled`);
  };

  const getAppVersion = async () => {
    try {
      // First check if we have access to the Electron API
      if (!window.electron) {
        throw new Error('Electron API not available');
      }

      // Check if getAppVersion function exists
      if (!window.electron.getAppVersion) {
        throw new Error('getAppVersion function not available');
      }

      // Try to get the version
      const result = await window.electron.getAppVersion();
      
      if (result && result.version) {
        setCurrentVersion(result.version);
        return result.version;
      } else {
        throw new Error('Invalid version response');
      }
    } catch (error) {
      console.error('Error getting app version:', error);
      setUpdateError('IPC not available');
      throw error;
    }
  };

  const directCheckForUpdates = async () => {
    console.log('Performing direct GitHub API check for updates');
    setUpdateStatus('checking');
    
    try {
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
        const response = await fetch('https://api.github.com/repos/jpaquino3/AI_Toolbox/releases/latest');
        
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }
        
        releaseInfo = await response.json();
        console.log('Latest release info:', releaseInfo);
        
        // Get GitHub version without any "v" prefix
        latestVersion = (releaseInfo.tag_name || '').replace(/^v/i, '').trim();
      }
      
      // Get current version without any "v" prefix
      const normalizedCurrentVersion = currentVersion.replace(/^v/i, '').trim();
      
      console.log(`Comparing versions - GitHub: "${latestVersion}", Current: "${normalizedCurrentVersion}"`);
      
      // Always set updateInfo so we have the latest version info
      setUpdateInfo({
        version: latestVersion,
        releaseNotes: releaseInfo?.body || 'Update available',
        releaseDate: releaseInfo?.published_at || new Date().toISOString()
      });
      
      // Check if the GitHub version is actually newer using semver comparison
      const isNewer = compareVersions(latestVersion, normalizedCurrentVersion);
      
      if (isNewer > 0) {
        console.log(`Update available: ${latestVersion} (current: ${normalizedCurrentVersion})`);
        setUpdateStatus('available');
      } else {
        console.log('No update available - already on latest version');
        setUpdateStatus('not-available');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateStatus('error');
      setUpdateError(error.message);
    }
  };
  
  // Simple semver comparison function
  // Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
  const compareVersions = (v1, v2) => {
    try {
      const v1Parts = v1.split('.').map(Number);
      const v2Parts = v2.split('.').map(Number);
      
      // Compare each part of the version
      for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        
        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
      }
      
      return 0; // Versions are equal
    } catch (err) {
      console.error('Error comparing versions:', err);
      // If there's any error in comparison, assume versions are the same
      return 0;
    }
  };

  const handleCheckForUpdates = async () => {
    if (!isElectron) {
      showMessage('Auto-updates are only available in the desktop app');
      return;
    }
    
    setUpdateStatus('checking');
    setUpdateError('');
    
    try {
      // Double check that electron is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error('Electron is not available');
      }
      
      // Always prefer the directCheckForUpdates method which checks latest-mac.yml
      if (window.electron.directCheckForUpdates) {
        console.log('Using direct GitHub check that includes latest-mac.yml');
        try {
          const result = await window.electron.directCheckForUpdates();
          console.log('Update check result:', result);
          
          if (result.error) {
            throw new Error(result.error);
          }
          
          // Set current version from result if available
          if (result.currentVersion) {
            setCurrentVersion(result.currentVersion);
          }
          
          if (result.updateAvailable) {
            setUpdateStatus('available');
            setUpdateInfo({
              version: result.latestVersion,
              releaseNotes: result.releaseInfo?.body || 'Update available',
              releaseDate: result.releaseInfo?.published_at || new Date().toISOString()
            });
          } else {
            setUpdateStatus('not-available');
            setUpdateInfo({
              version: result.latestVersion || currentVersion
            });
          }
          return;
        } catch (directError) {
          console.error('Error in directCheckForUpdates:', directError);
          // Fall through to other methods if this fails
        }
      }
      
      // Fall back to IPC-based check if available
      if (ipcAvailable && window.electron.checkForUpdates) {
        console.log('Falling back to IPC-based update check');
        // Wait a short time to ensure IPC is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify IPC connection before trying to check for updates
        if (window.electron.testIpc) {
          try {
            const testResult = await window.electron.testIpc();
            if (!testResult || !testResult.success) {
              throw new Error('IPC connection test failed');
            }
          } catch (err) {
            throw new Error(`IPC test failed: ${err.message}`);
          }
        }
        
        // Now try to check for updates
        await window.electron.checkForUpdates();
        return;
      }
      
      // As a last resort, use our own direct GitHub API check
      console.log('Using last-resort direct GitHub API check');
      await directCheckForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateStatus('error');
      setUpdateError(error.message || 'Unknown error');
      showMessage(`Update check failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!isElectron) return;
    
    try {
      if (window.electron?.ipcRenderer) {
        setUpdateStatus('downloading');
        await window.electron.ipcRenderer.invoke('download-update');
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setUpdateStatus('error');
      setUpdateError(error.message);
    }
  };

  const handleRestartForUpdate = async () => {
    if (!isElectron) return;
    
    try {
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('quit-and-install');
      }
    } catch (error) {
      console.error('Error restarting app:', error);
      showMessage('Error restarting app: ' + error.message);
    }
  };

  const handleResetAllData = () => {
    if (window.confirm('Are you sure you want to reset ALL app data? This action cannot be undone.')) {
      localStorage.clear();
      showMessage('All app data has been reset. The app will refresh now.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };
  
  const renderUpdateStatus = () => {
    switch (updateStatus) {
      case 'checking':
        return (
          <div className="text-blue-600">
            <span className="animate-pulse">Checking for updates...</span>
          </div>
        );
      case 'available':
        return (
          <div className="text-green-600">
            <div>Update available: {updateInfo?.version || 'New version'}</div>
            <button
              onClick={handleDownloadUpdate}
              className="mt-2 bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
            >
              Download Update
            </button>
          </div>
        );
      case 'not-available':
        return (
          <div className="text-gray-600">
            <div>You're running the latest version</div>
            <div className="text-xs mt-1 text-gray-500">
              Latest release: {updateInfo?.version || currentVersion}
            </div>
          </div>
        );
      case 'downloading':
        return (
          <div className="text-blue-600">
            <div>Downloading update: {updateProgress.toFixed(0)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${updateProgress}%` }}
              ></div>
            </div>
          </div>
        );
      case 'downloaded':
        return (
          <div className="text-green-600">
            <div>Update downloaded! Restart to apply.</div>
            <button
              onClick={handleRestartForUpdate}
              className="mt-2 bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
            >
              Restart Now
            </button>
          </div>
        );
      case 'error':
        return <div className="text-red-600">Error: {updateError}</div>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="flex items-center">
          <span className="mr-3">Theme:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </label>
        </div>
      </div>
      
      {isElectron && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Updates</h2>
          <div className="mb-4">
            <p className="mb-2">Current Version: {currentVersion || '1.2.1'}</p>
            {updateError === 'IPC not available' ? (
              <div className="text-amber-600 mb-2">
                <p>Update checking via system services is not available. Using direct GitHub API instead.</p>
              </div>
            ) : (
              renderUpdateStatus()
            )}
          </div>
          <button
            onClick={handleCheckForUpdates}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Check for Updates
          </button>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Reset App</h2>
        <p className="text-gray-600 mb-4">
          This will clear all your settings, tools, saved preferences, and cached data.
        </p>
        <button
          onClick={handleResetAllData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings; 