import React, { useState, useEffect } from 'react';

const MediaLibrarySettings = ({ showMessage, isElectron }) => {
  const [mediaLibraryPath, setMediaLibraryPath] = useState('');
  
  useEffect(() => {
    // Load saved media library path
    const savedPath = localStorage.getItem('mediaLibraryPath');
    if (savedPath) {
      setMediaLibraryPath(savedPath);
    }
  }, []);
  
  const handleSaveMediaLibraryPath = (e) => {
    e.preventDefault();
    
    // Save media library path to localStorage
    localStorage.setItem('mediaLibraryPath', mediaLibraryPath);
    
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('mediaLibraryPathChanged', { 
      detail: { path: mediaLibraryPath }
    }));
    
    // Show success message
    showMessage('Media library path saved successfully!');
  };

  const handleBrowseDirectory = () => {
    if (!isElectron()) {
      showMessage('Directory browsing is only available in the desktop app');
      return;
    }
    
    try {
      // Check for preload-exposed ipcRenderer
      if (window.electron && window.electron.ipcRenderer) {
        // Send a message to the main process to open the dialog
        window.electron.ipcRenderer.invoke('open-directory-dialog').then(result => {
          if (result && result.filePath) {
            const selectedPath = result.filePath;
            setMediaLibraryPath(selectedPath);
          }
        }).catch(err => {
          console.error('Error using IPC for directory selection:', err);
          showMessage(`Error selecting directory: ${err.message}`);
        });
        return;
      }
    
      // Fallback to legacy approach if needed
      const electron = window.require('electron');
      const dialog = electron.remote ? electron.remote.dialog : electron.dialog;
      
      if (!dialog) {
        throw new Error('Electron dialog API not available');
      }
      
      dialog.showOpenDialog({
        properties: ['openDirectory']
      }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          setMediaLibraryPath(selectedPath);
        }
      }).catch(err => {
        console.error('Error selecting directory:', err);
        showMessage(`Error selecting directory: ${err.message}`);
      });
    } catch (error) {
      console.error('Error opening directory dialog:', error);
      showMessage(`Cannot open directory dialog: ${error.message}`);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Media Library</h2>
      <p className="text-gray-600 mb-4">
        Configure where your media files are stored and organized.
      </p>
      
      <form onSubmit={handleSaveMediaLibraryPath}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media Library Path
          </label>
          <div className="flex">
            <input
              type="text"
              value={mediaLibraryPath}
              onChange={(e) => setMediaLibraryPath(e.target.value)}
              placeholder="Enter path to your media directory"
              className="flex-1 border rounded-l-md py-2 px-3"
            />
            <button
              type="button"
              onClick={handleBrowseDirectory}
              className="bg-indigo-600 text-white py-2 px-4 rounded-r-md hover:bg-indigo-700"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Specify a folder on your computer to display images in the Media Library. Files uploaded in the Media Library will be saved to this directory.
          </p>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <p className="font-medium">Important:</p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li>If no directory is set, uploaded images will only be stored in the app (not on your filesystem)</li>
            <li>When a directory is set, uploaded images will be saved directly to that folder</li>
            <li>Make sure you have write permissions for the selected directory</li>
          </ul>
        </div>
        
        <div className="mt-4">
          <button
            type="submit"
            className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
          >
            Save Media Library Path
          </button>
        </div>
      </form>
    </div>
  );
};

export default MediaLibrarySettings; 