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
  const [energySaver, setEnergySaver] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(getInitialVersion);
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [ipcAvailable, setIpcAvailable] = useState(false);
  const [lastProgressLogTime, setLastProgressLogTime] = useState(0);
  const PROGRESS_LOG_INTERVAL = 1000; // Only log every 1 second
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseNotesLoading, setReleaseNotesLoading] = useState(false);

  useEffect(() => {
    // Load dark mode setting
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Load energy saver setting
    const savedEnergySaver = localStorage.getItem('energySaver') === 'true';
    setEnergySaver(savedEnergySaver);
    
    // Fetch release notes on component mount
    if (isElectron) {
      fetchReleaseNotes();
    }
    
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
        
        const removeDownloadedListener = window.electron.onUpdateDownloaded
          ? window.electron.onUpdateDownloaded((info) => {
              console.log('Update downloaded event received with info:', info);
              setUpdateStatus('downloaded');
              // Update the info object with any new properties from the download
              if (info) {
                setUpdateInfo(prevInfo => ({
                  ...prevInfo,
                  ...info,
                  downloadPath: info.downloadedFile || info.path
                }));
              }
            })
          : null;
        
        const removeStatusListener = window.electron.onUpdateStatus
          ? window.electron.onUpdateStatus((statusInfo) => {
              console.log('Update status event received:', statusInfo);
              if (statusInfo.status) {
                setUpdateStatus(statusInfo.status);
                if (statusInfo.status === 'downloaded') {
                  // If we get a direct 'downloaded' status, make sure we update the UI
                  setUpdateInfo(prevInfo => ({
                    ...prevInfo,
                    version: statusInfo.version || prevInfo?.version,
                    downloadPath: statusInfo.path
                  }));
                }
              }
            })
          : null;
        
        const removeErrorListener = window.electron.onUpdateError
          ? window.electron.onUpdateError((error) => {
              console.log('Update error event received:', error);
              setUpdateStatus('error');
              setUpdateError(error.message || 'Unknown error');
            })
          : null;
        
        if (window.electron.onDownloadProgress) {
          window.electron.onDownloadProgress((progressObj) => {
            // Always update the UI
            setUpdateStatus('downloading');
            setUpdateProgress(progressObj.percent || 0);
            
            // But throttle console logs to reduce spam
            const now = Date.now();
            if (now - lastProgressLogTime >= PROGRESS_LOG_INTERVAL || progressObj.percent === 100) {
              console.log(`Download progress: ${progressObj.percent}%`);
              setLastProgressLogTime(now);
            }
          });
        }
        
        // Store cleanup functions
        const cleanupListeners = () => {
          if (removeAvailableListener) removeAvailableListener();
          if (removeNotAvailableListener) removeNotAvailableListener();
          if (removeDownloadedListener) removeDownloadedListener();
          if (removeStatusListener) removeStatusListener();
          if (removeErrorListener) removeErrorListener();
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

    // Setup event listeners for update events
    if (window.electron?.ipcRenderer) {
      console.log('Setting up update event listeners');
      
      const updateAvailableHandler = (info) => {
        console.log('Update available event received:', info);
        setUpdateStatus('available');
        setUpdateInfo(info);
        showMessage('Update available!');
      };
      
      const updateNotAvailableHandler = () => {
        console.log('Update not available event received');
        setUpdateStatus('not-available');
        showMessage('App is up to date');
      };
      
      const updateDownloadedHandler = (info) => {
        console.log('Update downloaded event received:', info);
        setUpdateStatus('downloaded');
        showMessage('Update downloaded and ready to install');
      };
      
      const downloadProgressHandler = (progressObj) => {
        // Always update the UI
        setUpdateStatus('downloading');
        setUpdateProgress(progressObj.percent || 0);
        
        // But throttle console logs to reduce spam
        const now = Date.now();
        if (now - lastProgressLogTime >= PROGRESS_LOG_INTERVAL || progressObj.percent === 100) {
          console.log(`Download progress: ${progressObj.percent}%`);
          setLastProgressLogTime(now);
        }
      };
      
      const updateErrorHandler = (error) => {
        console.error('Update error event received:', error);
        setUpdateStatus('error');
        
        // Handle specific error types
        const errorMsg = error.message || 'Unknown error';
        setUpdateError(errorMsg);
        
        // Show appropriate message based on error type
        if (errorMsg.includes('certificate') || errorMsg.includes('CERT')) {
          showMessage('Certificate error: Try using a different network connection or check system time');
        } else if (errorMsg.includes('already in progress')) {
          showMessage('Update is already in progress, please wait');
          // Don't set to error state for this case
          setUpdateStatus('downloading');
        } else {
          showMessage(`Error checking for updates: ${errorMsg}`);
        }
      };
      
      // Register event handlers
      window.electron.ipcRenderer.on('update-available', updateAvailableHandler);
      window.electron.ipcRenderer.on('update-not-available', updateNotAvailableHandler);
      window.electron.ipcRenderer.on('update-downloaded', updateDownloadedHandler);
      window.electron.ipcRenderer.on('download-progress', downloadProgressHandler);
      window.electron.ipcRenderer.on('update-error', updateErrorHandler);
      
      // Clean up listeners
      return () => {
        window.electron.ipcRenderer.removeListener('update-available', updateAvailableHandler);
        window.electron.ipcRenderer.removeListener('update-not-available', updateNotAvailableHandler);
        window.electron.ipcRenderer.removeListener('update-downloaded', updateDownloadedHandler);
        window.electron.ipcRenderer.removeListener('download-progress', downloadProgressHandler);
        window.electron.ipcRenderer.removeListener('update-error', updateErrorHandler);
      };
    }
  }, [isElectron, showMessage]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    showMessage('Theme updated successfully');
  };

  const toggleEnergySaver = () => {
    const newEnergySaver = !energySaver;
    setEnergySaver(newEnergySaver);
    localStorage.setItem('energySaver', newEnergySaver);
    showMessage('Energy saver mode updated successfully');
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
      const versionCompare = compareVersions(latestVersion, normalizedCurrentVersion);
      
      // Allow downgrading or upgrading
      if (versionCompare !== 0) {
        console.log(`Version difference detected: ${latestVersion} (latest) vs ${normalizedCurrentVersion} (current)`);
        setUpdateStatus('available');
        setUpdateInfo({
          version: latestVersion,
          releaseNotes: releaseInfo?.body || 'Update available',
          releaseDate: releaseInfo?.published_at || new Date().toISOString(),
          isDowngrade: versionCompare < 0 // Flag indicating if this is a downgrade
        });
      } else {
        console.log('No update available - already on same version');
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

  const fetchReleaseNotes = async () => {
    setReleaseNotesLoading(true);
    try {
      // Try the dedicated getReleaseNotes function first
      if (window.electron && window.electron.getReleaseNotes) {
        const result = await window.electron.getReleaseNotes();
        if (result && result.success && result.releaseNotes) {
          setReleaseNotes(result.releaseNotes);
          setReleaseNotesLoading(false);
          return;
        }
      }
      
      // Try to get release notes from the update check result
      if (window.electron && window.electron.checkForUpdates) {
        const updateResult = await window.electron.checkForUpdates();
        if (updateResult && updateResult.releaseNotes) {
          setReleaseNotes(updateResult.releaseNotes);
          setReleaseNotesLoading(false);
          return;
        }
      }
      
      // Fallback: Fetch directly from GitHub API
      const response = await fetch('https://api.github.com/repos/jpaquino3/AI_Toolbox/releases/latest');
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      const releaseInfo = await response.json();
      if (releaseInfo && releaseInfo.body) {
        setReleaseNotes(releaseInfo.body);
      } else {
        setReleaseNotes('No release notes available.');
      }
    } catch (error) {
      console.error('Error fetching release notes:', error);
      setReleaseNotes('Error loading release notes. Please try again later.');
    }
    setReleaseNotesLoading(false);
  };

  const handleCheckForUpdates = async () => {
    if (!isElectron) {
      showMessage('Auto-updates are only available in the desktop app');
      return;
    }
    
    setUpdateStatus('checking');
    setUpdateError('');
    
    // Fetch release notes in parallel
    fetchReleaseNotes();
    
    try {
      // Double check that electron is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error('Electron is not available');
      }
      
      // Log available methods for debugging
      console.log('Available electron methods:', Object.keys(window.electron));
      if (window.electron.ipcRenderer) {
        console.log('IPC methods:', Object.keys(window.electron.ipcRenderer));
      }
      
      // First try the most direct method - the IPC invoke to check-for-updates
      if (window.electron.ipcRenderer && typeof window.electron.ipcRenderer.invoke === 'function') {
        console.log('Using direct IPC invoke to check for updates');
        try {
          const result = await window.electron.ipcRenderer.invoke('check-for-updates');
          console.log('IPC check-for-updates result:', result);
          
          if (result && result.error) {
            throw new Error(result.error);
          }
          
          // Wait for events from the auto-updater rather than immediately setting state
          console.log('Update check initiated, waiting for auto-updater events');
          return;
        } catch (ipcError) {
          console.error('Error in IPC check-for-updates:', ipcError);
          // Fall through to other methods
        }
      }
      
      // Then try the electron.directCheckForUpdates method
      if (window.electron.directCheckForUpdates) {
        console.log('Using direct GitHub check that includes latest-mac.yml');
        try {
          const result = await window.electron.directCheckForUpdates();
          console.log('Update check result:', result);
          
          if (result.error) {
            throw new Error(result.error);
          }
          
          // Allow both upgrades and downgrades
          if (result.latestVersion !== result.currentVersion) {
            // Check if this is a downgrade
            const isDowngrade = compareVersions(result.latestVersion, result.currentVersion) < 0;
            
            setUpdateStatus('available');
            setUpdateInfo({
              version: result.latestVersion,
              releaseNotes: result.releaseInfo?.body || (isDowngrade ? 'Downgrade available' : 'Update available'),
              releaseDate: result.releaseInfo?.published_at || new Date().toISOString(),
              isDowngrade: isDowngrade,
              // Store the complete YAML data for direct download
              updateData: result.updateData
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
      
      // Try ipcRenderer.send method if available
      if (window.electron.ipcRenderer && typeof window.electron.ipcRenderer.send === 'function') {
        console.log('Using ipcRenderer.send for check-for-updates');
        
        const checkPromise = new Promise((resolve, reject) => {
          // Set up listeners for responses
          const checkHandler = (event, result) => {
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve(result);
            }
          };
          
          window.electron.ipcRenderer.once('check-for-updates-response', checkHandler);
          window.electron.ipcRenderer.once('update-available', () => {
            setUpdateStatus('available');
            resolve({ available: true });
          });
          window.electron.ipcRenderer.once('update-not-available', () => {
            setUpdateStatus('not-available');
            resolve({ available: false });
          });
          window.electron.ipcRenderer.once('update-error', (event, error) => {
            reject(new Error(error.message || 'Unknown error'));
          });
          
          // Set timeout
          setTimeout(() => {
            reject(new Error('Timeout waiting for update check response'));
          }, 30000);
          
          // Send the request
          window.electron.ipcRenderer.send('check-for-updates-request');
        });
        
        await checkPromise;
        return;
      }
      
      // Fall back to window.electron.checkForUpdates if available
      if (ipcAvailable && window.electron.checkForUpdates) {
        console.log('Falling back to checkForUpdates method');
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

  const handleDownloadUpdate = async (version) => {
    if (!isElectron) return;
    
    try {
      setUpdateStatus('downloading');
      setUpdateProgress(0);
      setUpdateError('');
      
      console.log('Downloading update...');
      
      if (!window.electron) {
        throw new Error('Electron bridge not available');
      }
      
      // Call the download update method
      if (window.electron.downloadUpdate) {
        const result = await window.electron.downloadUpdate(version);
        console.log('Download result:', result);
        
        if (result && result.error) {
          throw new Error(result.error);
        }
        
        if (result && result.success) {
          // On macOS, if it's a direct download to Downloads folder, we don't need to show
          // the "Install Update" button since the DMG is ready for the user to open
          if (result.filePath && isMacOS()) {
            const isDirectDownload = result.filePath.includes('Downloads');
            if (isDirectDownload) {
              // The DMG has been downloaded directly to Downloads folder
              // The user will have been shown a dialog to open it
              setUpdateStatus('downloaded_direct');
              return;
            }
          }
          
          // Standard electron-updater download completed
          setUpdateStatus('downloaded');
        } else {
          setUpdateStatus('error');
          throw new Error('Update download failed');
        }
        
        return;
      }
      
      // Fall back to IPC invoke if available
      if (window.electron.ipcRenderer && typeof window.electron.ipcRenderer.invoke === 'function') {
        const result = await window.electron.ipcRenderer.invoke('download-update', version);
        console.log('Download result:', result);
        
        if (result && result.error) {
          throw new Error(result.error);
        }
        
        if (result && result.success) {
          // On macOS, if it's a direct download to Downloads folder, we don't need to show
          // the "Install Update" button since the DMG is ready for the user to open
          if (result.filePath && isMacOS()) {
            const isDirectDownload = result.filePath.includes('Downloads');
            if (isDirectDownload) {
              // The DMG has been downloaded directly to Downloads folder
              // The user will have been shown a dialog to open it
              setUpdateStatus('downloaded_direct');
              return;
            }
          }
          
          setUpdateStatus('downloaded');
        } else {
          setUpdateStatus('error');
          throw new Error('Update download failed');
        }
        
        return;
      }
      
      throw new Error('No suitable update download method available');
    } catch (error) {
      console.error('Error downloading update:', error);
      setUpdateStatus('error');
      setUpdateError(error.message || 'Unknown error occurred during update');
      showMessage(`Error downloading update: ${error.message}`);
    }
  };

  const handleInstallUpdate = async () => {
    // For macOS, we've now switched to direct DMG downloads to the Downloads folder,
    // so this function shouldn't be called for manual DMG installation
    if (!isElectron) return;
    
    try {
      setUpdateStatus('installing');
      setUpdateError('');
      
      console.log('Installing update...');
      
      if (!window.electron) {
        throw new Error('Electron bridge not available');
      }
      
      // Call the quit and install method
      if (window.electron.quitAndInstall) {
        const result = await window.electron.quitAndInstall();
        console.log('Quit and install result:', result);
        
        if (result && result.error) {
          // Log the specific error for debugging
          console.error('Update installation error:', result.error);
          
          if (result.error.includes('TARGET_APP is not defined')) {
            throw new Error('Could not locate the application path. Please try downloading the update manually.');
          } else {
            throw new Error(result.error);
          }
        }
        
        // Note: The app should quit and restart, so we shouldn't reach this point
        return;
      }
      
      // Fall back to IPC invoke if available
      if (window.electron.ipcRenderer && typeof window.electron.ipcRenderer.invoke === 'function') {
        const result = await window.electron.ipcRenderer.invoke('quit-and-install');
        console.log('Quit and install result:', result);
        
        if (result && result.error) {
          // Log the specific error for debugging
          console.error('Update installation error:', result.error);
          
          if (result.error.includes('TARGET_APP is not defined')) {
            throw new Error('Could not locate the application path. Please try downloading the update manually.');
          } else {
            throw new Error(result.error);
          }
        }
        
        return;
      }
      
      // Fall back to IPC send if available
      if (window.electron.ipcRenderer && typeof window.electron.ipcRenderer.send === 'function') {
        window.electron.ipcRenderer.send('quit-and-install-request');
        return;
      }
      
      throw new Error('No suitable update installation method available');
    } catch (error) {
      console.error('Error installing update:', error);
      setUpdateStatus('error');
      
      // Provide a more user-friendly error message
      let userMessage = error.message || 'Unknown error installing update';
      
      // Ensure the GitHub manual download suggestion is included for terminal errors
      if (!userMessage.includes('manually')) {
        userMessage += '. You may need to download the update manually from GitHub.';
      }
      
      setUpdateError(userMessage);
      showMessage(`Error installing update: ${userMessage}`);
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
          <div className={updateInfo?.isDowngrade ? "text-amber-600" : "text-green-600"}>
            <div>{updateInfo?.isDowngrade ? "Downgrade" : "Update"} available: {updateInfo?.version || 'Different version'}</div>
            <button
              onClick={() => handleDownloadUpdate(updateInfo?.version)}
              className={`mt-2 ${updateInfo?.isDowngrade ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"} text-white px-3 py-1 text-sm rounded`}
            >
              {updateInfo?.isDowngrade ? "Downgrade Now" : "Download Update"}
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
              onClick={handleInstallUpdate}
              className="mt-2 bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
            >
              Install Update
            </button>
          </div>
        );
      case 'downloaded_direct':
        return (
          <div className="text-green-600">
            <div>Update downloaded to your Downloads folder!</div>
            <div className="text-sm mt-1">
              Please open the DMG file and drag the app to your Applications folder to complete the update.
            </div>
          </div>
        );
      case 'installing':
        return (
          <div className="text-blue-600">
            <div>Installing update...</div>
          </div>
        );
      case 'error':
        return <div className="text-red-600">Error: {updateError}</div>;
      default:
        return null;
    }
  };

  // Helper function to detect macOS
  const isMacOS = () => {
    return window.navigator.platform.toLowerCase().includes('mac') || 
           (window.electron && window.electron.platform === 'darwin');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="flex items-center mb-4">
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
        <div className="flex items-center">
          <span className="mr-3">Energy Saver:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={energySaver}
              onChange={toggleEnergySaver}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3">{energySaver ? 'On' : 'Off'}</span>
          </label>
          <p className="ml-3 text-sm text-gray-500">
            When enabled, videos in webviews will not autoplay but can be played manually
          </p>
        </div>
      </div>
      
      {isElectron && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Updates</h2>
          <div className="flex flex-col md:flex-row">
            <div className="mb-4 md:w-1/2 md:pr-4">
              <p className="mb-2">Current Version: {currentVersion || '1.2.1'}</p>
              {updateError === 'IPC not available' ? (
                <div className="text-amber-600 mb-2">
                  <p>Update checking via system services is not available. Using direct GitHub API instead.</p>
                </div>
              ) : (
                renderUpdateStatus()
              )}
              <button
                onClick={handleCheckForUpdates}
                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 mt-4"
              >
                Check for Updates
              </button>
            </div>
            
            <div className="md:w-1/2 md:pl-4">
              <div className="border rounded p-3 h-[200px] overflow-y-auto bg-gray-50">
                <h3 className="font-medium mb-2">Release Notes</h3>
                {releaseNotesLoading ? (
                  <div className="text-gray-500 text-sm flex items-center justify-center h-[160px]">
                    <div className="animate-pulse">Loading release notes...</div>
                  </div>
                ) : releaseNotes ? (
                  <div className="text-sm whitespace-pre-line">
                    {releaseNotes}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm italic">
                    Check for updates to see the latest release notes.
                  </div>
                )}
              </div>
            </div>
          </div>
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