import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import './MediaLibrary.css';

// Production environment detection
const isProd = process.env.NODE_ENV === 'production';

// A much simpler fix for keybindings in production
if (isProd && typeof window !== 'undefined') {
  // Add function to reset all keybindings
  window.resetAllKeybindings = function() {
    try {
      // Set to empty object (will use defaults)
      localStorage.setItem('keybindings', '{}');
      console.log('All keybindings have been reset');
      return true;
    } catch (e) {
      console.error('Failed to reset keybindings:', e);
      return false;
    }
  };
  
  // One-time fix for keybindings: run only once at startup
  try {
    // Save the original localStorage methods
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    
    // Make a one-time backup of keybindings if they exist
    const keybindingsData = originalGetItem.call(localStorage, 'keybindings');
    if (keybindingsData) {
      // Store a backup, but don't create a cycle of storage operations
      originalSetItem.call(localStorage, 'keybindings_backup', keybindingsData);
      
      // Check and fix case inconsistency in keybindings
      try {
        const keybindings = JSON.parse(keybindingsData);
        let needsUpdate = false;
        
        // Case conversion mapping for common keys
        const caseMapping = {
          'opennotes': 'openNotes',
          'togglerecenttools': 'toggleRecentTools',
          'togglemedialibrary': 'toggleMediaLibrary', 
          'toggledebug': 'toggleDebug',
          'openassistant': 'openAssistant'
        };
        
        // For each lowercase key with a value, copy to the camelCase version
        Object.keys(caseMapping).forEach(lowercaseKey => {
          if (keybindings[lowercaseKey] && !keybindings[caseMapping[lowercaseKey]]) {
            keybindings[caseMapping[lowercaseKey]] = keybindings[lowercaseKey];
            needsUpdate = true;
          }
        });
        
        // Save the fixed version if we made changes
        if (needsUpdate) {
          originalSetItem.call(localStorage, 'keybindings', JSON.stringify(keybindings));
          console.log('Fixed case inconsistency in keybindings');
        }
      } catch (parseErr) {
        console.error('Error parsing keybindings:', parseErr);
      }
    }
    
    // Only override if we haven't before (prevents recursive loops)
    if (!window._keybindingsOverrideApplied) {
      window._keybindingsOverrideApplied = true;
      
      // Create a simple getter that falls back to backup
      localStorage.getItem = function(key) {
        if (key === 'keybindings') {
          const value = originalGetItem.call(localStorage, key);
          // If missing, try to restore from backup
          if (!value) {
            const backup = originalGetItem.call(localStorage, 'keybindings_backup');
            if (backup) return backup;
          }
          return value;
        }
        return originalGetItem.call(localStorage, key);
      };
    }
  } catch (e) {
    console.error('Error in keybindings fix:', e);
  }
  
  // Add a global normalizer function to fix case issues
  window.normalizeKeybindings = function() {
    try {
      // Get current keybindings
      const data = localStorage.getItem('keybindings');
      if (!data) return false;
      
      const keybindings = JSON.parse(data);
      let updated = false;
      
      // Case mapping
      const caseMapping = {
        'opennotes': 'openNotes',
        'togglerecenttools': 'toggleRecentTools',
        'togglemedialibrary': 'toggleMediaLibrary', 
        'toggledebug': 'toggleDebug',
        'openassistant': 'openAssistant'
      };
      
      // Copy values from lowercase to camelCase
      Object.keys(caseMapping).forEach(lowerKey => {
        if (keybindings[lowerKey]) {
          keybindings[caseMapping[lowerKey]] = keybindings[lowerKey];
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem('keybindings', JSON.stringify(keybindings));
        console.log('Keybindings normalized');
        return true;
      }
    } catch (e) {
      console.error('Error normalizing keybindings:', e);
    }
    return false;
  };
  
  // Run the normalizer at startup
  setTimeout(window.normalizeKeybindings, 1000);
  
  // Simple emergency fix function
  window.fixKeybindings = function() {
    try {
      // First normalize case
      window.normalizeKeybindings();
      
      // Then try to restore from backup if needed
      const backup = localStorage.getItem('keybindings_backup');
      if (backup) {
        localStorage.setItem('keybindings', backup);
        // Run normalizer again on the restored data
        setTimeout(window.normalizeKeybindings, 50);
        return true;
      }
    } catch (e) {
      console.error('Fix failed:', e);
    }
    return false;
  };
}

// For production debugging: Add helper to diagnose keybinding issues
if (isProd && typeof window !== 'undefined') {
  window.debugKeybindings = function() {
    console.log('=== KEYBINDING DEBUG INFORMATION ===');
    
    // List all localStorage items
    console.log('All localStorage keys:');
    Object.keys(localStorage).forEach(key => {
      console.log(`- ${key}`);
    });
    
    return {
      reset: function() {
        localStorage.setItem('keybindings', '{}');
        document.body.style = '';
        document.body.className = '';
        console.log('Keybindings reset to defaults');
      }
    };
  };
}

// Use isolated localStorage keys with unique prefix
const STORAGE_PREFIX = 'ml_isolated_';
const FOLDER_HANDLE_KEY = `${STORAGE_PREFIX}folderHandle`;
const FILES_KEY = `${STORAGE_PREFIX}files`;

// Simplified reset function that doesn't trigger loops
if (typeof window !== 'undefined') {
  window.resetKeyboardHandlers = function() {
    // Reset body classes and styles
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Remove any modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    
    // Remove any MediaLibrary elements completely
    document.querySelectorAll('.media-library-modal, .media-library-panel').forEach(el => el.remove());
    
    // For production builds, inject a special style
    if (isProd && !document.getElementById('media-library-fix')) {
      const style = document.createElement('style');
      style.id = 'media-library-fix';
      style.innerHTML = `
        .modal, .modal-backdrop, .media-library-panel { 
          pointer-events: none !important;
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
}

// Completely separate wrapper component that only renders MediaLibrary when needed
const MediaLibraryWrapper = (props) => {
  // Clean up once on first mount
  useEffect(() => {
    window.resetKeyboardHandlers();
  }, []);
  
  // Clean up when closed
  useEffect(() => {
    if (!props.isOpen) {
      // Single cleanup when component closes
      window.resetKeyboardHandlers();
    } else {
      // When opening, remove any lingering cleanup styles
      const style = document.getElementById('media-library-fix');
      if (style) {
        style.remove();
      }
    }
  }, [props.isOpen]);
  
  // If not open, don't render anything at all
  if (!props.isOpen) return null;
  
  // Only mount the actual component when needed
  return <MediaLibraryContent {...props} />;
};

// Inner content component that handles the actual functionality
const MediaLibraryContent = ({ isOpen, onClose, onSelect, viewMode = 'panel' }) => {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [isElectron, setIsElectron] = useState(false);
  const [folderHandle, setFolderHandle] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);
  const [imagePopup, setImagePopup] = useState(null);
  const [draggingFile, setDraggingFile] = useState(null);

  // Clean up only DOM-related artifacts on unmount 
  useEffect(() => {
    return () => {
      // Only clean up DOM elements, not events
      if (viewMode === 'modal') {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
      }
    };
  }, [viewMode]);

  // Check if the browser supports the File System Access API
  const isFileSystemAccessSupported = () => {
    return 'showDirectoryPicker' in window;
  };

  // Check if Electron is available
  useEffect(() => {
    setIsElectron(!!window.electron?.isAvailable);
  }, []);

  // Close the context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load files from previously selected folder
  useEffect(() => {
    // Try to load previously selected folder if available
    const loadSavedFolder = async () => {
      try {
        if (!isFileSystemAccessSupported()) {
          return;
        }
        
        // Check for a saved folder in localStorage with our isolated key
        const savedFolderHandle = localStorage.getItem(FOLDER_HANDLE_KEY);
        if (savedFolderHandle) {
          try {
            // Request permission to the folder
            const handle = JSON.parse(savedFolderHandle);
            if (handle && handle.name) {
              setCurrentFolder(handle.name);
              // Re-request permission
              try {
                await window.showDirectoryPicker({
                  id: handle.id,
                  startIn: handle
                });
                loadFilesFromHandle(handle);
              } catch (permErr) {
                console.log('Permission denied or folder no longer accessible');
                localStorage.removeItem(FOLDER_HANDLE_KEY);
              }
            }
          } catch (err) {
            console.error('Error parsing saved folder handle:', err);
          }
        }
      } catch (err) {
        console.error('Error loading saved folder:', err);
      }
    };
    
    loadSavedFolder();
  }, []);

  // Simple close function that just notifies the parent
  const closeModal = () => {
    if (onClose) {
      onClose();
    }
  };

  // Fallback to load from localStorage
  useEffect(() => {
    // Only load files from localStorage if no folder is selected
    if (!folderHandle && files.length === 0) {
      try {
        const savedFiles = localStorage.getItem(FILES_KEY);
        if (savedFiles) {
          const parsedFiles = JSON.parse(savedFiles);
          // Filter out any files that don't have valid URLs
          const validFiles = parsedFiles.filter(file => 
            file.url && !file.url.startsWith('blob:') && !file.url.startsWith('file:')
          );
          setFiles(validFiles);
        }
      } catch (err) {
        console.error('Error loading saved files:', err);
      }
    }
  }, [folderHandle, files.length]);

  // Save files when they change (only for non-native files)
  useEffect(() => {
    if (files.length > 0 && !folderHandle) {
      try {
        // Only save files with data URLs, not blob URLs which expire
        const savableFiles = files
          .filter(file => file.url && file.url.startsWith('data:'))
          .map(({ id, name, url }) => ({ id, name, url }));
          
        if (savableFiles.length > 0) {
          localStorage.setItem(FILES_KEY, JSON.stringify(savableFiles));
        }
      } catch (err) {
        console.error('Error saving files:', err);
      }
    }
  }, [files, folderHandle]);

  const loadFilesFromHandle = async (handle) => {
    try {
      if (!handle) {
        console.error('No folder handle provided');
        return;
      }
      
      // Store the full folder path - IMPORTANT: needed for "Reveal in Finder"
      // This will get the actual filesystem path from the handle
      let absoluteFolderPath = '';
      try {
        if (handle.getDirectoryHandle) {
          // Web File System API doesn't provide direct access to file paths
          // So we'll use the handle.name as the relative path
          absoluteFolderPath = handle.name;
        }
      } catch (err) {
        console.error('Error getting folder path:', err);
      }
      
      setCurrentFolder(handle.name);
      console.log('Selected folder path:', absoluteFolderPath);
      
      const filePromises = [];
      
      // Function to recursively process directories (up to a reasonable depth)
      async function processDirectoryEntries(dirHandle, path = '', depth = 0) {
        // Limit depth to avoid infinite recursion
        if (depth > 3) return;
        
        try {
          // Get all entries in the directory
          for await (const entry of dirHandle.values()) {
            try {
              if (entry.kind === 'file') {
                // Get file handle
                const fileHandle = entry;
                const file = await fileHandle.getFile();
                
                // Only process image files
                if (file.type.startsWith('image/')) {
                  const filePath = path ? `${path}/${file.name}` : file.name;
                  
                  // Create a URL for the file
                  const url = URL.createObjectURL(file);
                  
                  // For Electron, we need to store the full directory path
                  // This is critical for "Reveal in Finder" to work
                  const fullFilePath = absoluteFolderPath ? `${absoluteFolderPath}/${filePath}` : filePath;
                  
                  filePromises.push({
                    id: `${Date.now()}-${Math.random()}`,
                    name: file.name,
                    url,
                    file,
                    path: fullFilePath
                  });
                }
              } else if (entry.kind === 'directory') {
                // Process subdirectory
                await processDirectoryEntries(
                  entry, 
                  path ? `${path}/${entry.name}` : entry.name,
                  depth + 1
                );
              }
            } catch (entryError) {
              console.error(`Error processing entry ${entry.name}:`, entryError);
            }
          }
        } catch (dirError) {
          console.error('Error reading directory entries:', dirError);
        }
      }
      
      // Start processing from the root directory
      await processDirectoryEntries(handle);
      
      const loadedFiles = await Promise.all(filePromises);
      setFiles(loadedFiles);
      setFolderHandle(handle);
      
      // Try to persist permission
      try {
        if ('permissions' in navigator) {
          await handle.requestPermission({ mode: 'read' });
          
          // Save folder handle reference to localStorage
          localStorage.setItem(FOLDER_HANDLE_KEY, JSON.stringify({
            name: handle.name,
            id: handle.name
          }));
        }
      } catch (err) {
        console.warn('Could not persist folder permission', err);
      }
    } catch (err) {
      console.error('Error loading files from folder:', err);
      setError(`Error loading files: ${err.message}`);
    }
  };

  const handleChooseFolder = async () => {
    try {
      if (isElectron) {
        // Use Electron's dialog for folder selection to get the real filesystem path
        try {
          console.log('Using Electron dialog to select folder');
          const result = await window.electron.selectFolder();
          
          if (result && result.success && result.folderPath) {
            console.log('Selected folder path from Electron:', result.folderPath);
            // Now load files from this folder
            await loadFilesFromElectronPath(result.folderPath);
            return;
          }
        } catch (electronErr) {
          console.error('Error using Electron dialog:', electronErr);
        }
      }
      
      // Fall back to browser API if Electron selection fails or isn't available
      if (!isFileSystemAccessSupported()) {
        setError('Your browser does not support the File System Access API. Please use Chrome, Edge, or another browser with this feature enabled.');
        return;
      }
      
      console.log('Using browser File System API to select folder');
      const handle = await window.showDirectoryPicker();
      await loadFilesFromHandle(handle);
    } catch (err) {
      // User canceled or permission denied
      if (err.name !== 'AbortError') {
        console.error('Error selecting folder:', err);
        setError(`Error selecting folder: ${err.message}`);
      }
    }
  };

  const loadFilesFromElectronPath = async (folderPath) => {
    try {
      console.log('Loading files from Electron path:', folderPath);
      setCurrentFolder(folderPath);
      
      // Request file list from Electron main process
      const result = await window.electron.getImagesFromFolder(folderPath);
      
      if (result && result.success && result.files) {
        console.log(`Found ${result.files.length} images in folder`);
        
        // Convert the file info into our format
        const loadedFiles = result.files.map(fileInfo => ({
          id: `${Date.now()}-${Math.random()}`,
          name: fileInfo.name,
          url: fileInfo.url || `file://${fileInfo.path}`,
          path: fileInfo.path, // This is the full absolute path
          size: fileInfo.size
        }));
        
        setFiles(loadedFiles);
        setError(null);
      } else {
        console.error('Failed to load files:', result?.error || 'Unknown error');
        setError(`Failed to load files: ${result?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error loading files from Electron path:', err);
      setError(`Error loading files: ${err.message}`);
    }
  };

  const handleUploadImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const filePromises = Array.from(e.target.files).map(file => 
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              // Create a URL for the file
              const url = URL.createObjectURL(file);
              
              // Use the native file path if available from Electron
              // Otherwise use the filename - the main process will resolve the path
              let filePath = null;
              if (file.path) {
                filePath = file.path;
              } else {
                filePath = file.name;
              }
              
              resolve({
                id: `${Date.now()}-${Math.random()}`,
                name: file.name,
                url: url,
                file: file,
                path: filePath
              });
            };
            reader.readAsDataURL(file);
          })
        );
        
        Promise.all(filePromises).then(newFiles => {
          setFiles(prevFiles => [...prevFiles, ...newFiles]);
        });
      }
    };
    
    input.click();
  };

  const handleDeleteImage = (id, e) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleDragStart = (e, file) => {
    setDraggingFile(file.id);
    
    try {
      console.log('Starting drag for file with path:', file.path);
      
      // Set drag effect
      e.dataTransfer.effectAllowed = 'copy';
      
      // Clear any previous data
      e.dataTransfer.clearData();
      
      // CRITICAL: Set the file path as the primary data
      if (file.path) {
        // Ensure we have a proper file:// URL format
        let fileURL = null;
        
        // Make sure we normalize the path and don't double-prefix
        if (file.path) {
          // Clean path - remove any existing file:// prefix to avoid duplication
          let cleanPath = file.path;
          if (cleanPath.startsWith('file://')) {
            cleanPath = cleanPath.substring(7);
            // Remove any leading slashes after removing prefix
            while (cleanPath.startsWith('/')) {
              cleanPath = cleanPath.substring(1);
            }
          }
          
          // On macOS, file:// URLs need three slashes total for absolute paths
          if (cleanPath.startsWith('/')) {
            fileURL = `file:///${cleanPath}`;
          } else {
            fileURL = `file://${cleanPath}`;
          }
          
          // Make sure path is properly encoded
          fileURL = fileURL.replace(/ /g, '%20');
        }
        
        console.log('Using normalized file URL for drag & drop:', fileURL);
        
        // Set the URL in multiple formats for maximum compatibility
        e.dataTransfer.setData('text/uri-list', fileURL);
        e.dataTransfer.setData('text/plain', fileURL);
        e.dataTransfer.setData('URL', fileURL);
        
        // Create a binary Blob representing the actual image data for direct file drops
        if (file.url) {
          try {
            // Create an image element to load the image data
            const img = new Image();
            img.src = file.url;
            
            // Set a nice drag image
            e.dataTransfer.setDragImage(img, 10, 10);
            
            // Add HTML for direct image insertion
            const imgHtml = `<img src="${fileURL}" alt="${file.name}" style="max-width: 100%;">`;
            e.dataTransfer.setData('text/html', imgHtml);
          } catch (imgErr) {
            console.error('Error creating image data:', imgErr);
          }
        }
      } else {
        // Fallback for files without paths
        console.log('No path available, using file name for drag');
        e.dataTransfer.setData('text/plain', file.name || 'image');
      }
    } catch (error) {
      console.error('Error in handleDragStart:', error);
      // Fallback to basic text if everything else fails
      e.dataTransfer.setData('text/plain', file.path || file.name || 'image');
    }
  };

  const handleDragEnd = () => {
    setDraggingFile(null);
  };

  const handleImageClick = (file) => {
    // If there's an external handler, call it
    if (onSelect) {
      onSelect(file);
    } else {
      // Otherwise show our built-in image popup
      setImagePopup(file);
    }
  };

  const closeImagePopup = () => {
    setImagePopup(null);
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    if (isElectron && file.path) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        file
      });
    }
  };

  const handleRevealInFinder = async (file) => {
    setContextMenu(null);
    if (isElectron && file.path) {
      try {
        console.log('Revealing file at path:', file.path);
        
        // Request the absolute path from Electron's main process
        const result = await window.electron.revealFileInFinder(file.path);
        
        if (!result.success) {
          console.error('Failed to reveal file:', result.error);
          setError(`Failed to reveal file: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error revealing file:', error);
        setError(`Failed to reveal file: ${error.message || 'Unknown error'}`);
      }
    } else {
      console.error('Cannot reveal file: Electron not available or no path for file', file);
      setError('Cannot reveal file in Finder: No file path available');
    }
  };

  // NOTE: This function is now available in the Settings component
  // Kept here for compatibility - no longer displayed in the UI
  const handleResetKeybindings = () => {
    if (window.resetAllKeybindings) {
      if (window.confirm('Are you sure you want to reset all keyboard shortcuts to defaults?')) {
        window.resetAllKeybindings();
        alert('Keyboard shortcuts have been reset to defaults. You may need to refresh the page.');
      }
    } else {
      alert('Reset function not available');
    }
  };

  const renderModalView = () => {
    return (
      <Modal 
        show={true} 
        onHide={closeModal} 
        size="lg" 
        centered 
        className={`media-library-modal ${isProd ? 'production-mode' : ''}`}
        backdrop="static"
        keyboard={false}
        restoreFocus={false}
        enforceFocus={false}
        onEscapeKeyDown={(e) => {
          // Prevent the Escape key from bubbling in production
          e.stopPropagation();
          if (isProd) e.preventDefault();
        }}
        // Production: render into a detached node to prevent event bubbling
        container={isProd ? document.createElement('div') : (document.getElementById('root') || document.body)}
        // Additional production attributes
        data-production={isProd ? 'true' : 'false'}
        tabIndex="-1"
      >
        <Modal.Header closeButton>
          <Modal.Title>Media Library</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {renderContent()}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              <Button variant="secondary" onClick={handleChooseFolder}>
                Choose Folder
              </Button>
            </div>
            <Button variant="primary" onClick={closeModal}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    );
  };

  const renderPanelView = () => {
    return (
      <div 
        className="media-library-panel"
        // Prevent the panel from capturing keydowns that might interfere with global shortcuts
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="media-library-header">
          <h5>Media Library</h5>
          <Button size="sm" onClick={closeModal} variant="outline-secondary" className="close-btn">
            ×
          </Button>
        </div>
        {renderContent()}
        <div className="media-library-footer d-flex justify-content-between">
          <Button size="sm" variant="outline-primary" onClick={handleChooseFolder}>
            Choose Folder
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="media-library-content">
        {error && <Alert variant="danger">{error}</Alert>}
        
        {currentFolder && (
          <div className="current-folder mb-3">
            <strong>Current folder:</strong> {currentFolder}
          </div>
        )}
        
        <div className="button-group mb-3">
          <Button 
            variant="primary" 
            onClick={handleChooseFolder}
            className="me-2"
          >
            Choose Folder
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={handleUploadImages}
          >
            Upload Images
          </Button>
        </div>
        
        {files.length > 0 ? (
          <div className="image-grid">
            {files.map(file => (
              <div 
                key={file.id} 
                className="image-container"
                onClick={() => handleImageClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onDragEnd={handleDragEnd}
                dragging={draggingFile === file.id ? "true" : "false"}
              >
                <img src={file.url} alt={file.name} />
                <div className="image-name">{file.name}</div>
                <button 
                  className="delete-button"
                  onClick={(e) => handleDeleteImage(file.id, e)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
            <p>No images yet. Choose a folder or upload some to get started.</p>
          </div>
        )}
        
        {contextMenu && (
          <div 
            ref={contextMenuRef}
            className="context-menu"
            style={{ 
              position: 'fixed', 
              top: contextMenu.y, 
              left: contextMenu.x,
              zIndex: 1050
            }}
          >
            <div className="context-menu-item" onClick={() => handleRevealInFinder(contextMenu.file)}>
              <span role="img" aria-label="finder" style={{ marginRight: '8px' }}>🔍</span>
              Reveal in Finder
            </div>
          </div>
        )}

        {imagePopup && (
          <div className="image-popup" onClick={closeImagePopup}>
            <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
              <img src={imagePopup.url} alt={imagePopup.name} />
              <div className="image-popup-name">{imagePopup.name}</div>
              <button className="image-popup-close" onClick={closeImagePopup}>×</button>
            </div>
          </div>
        )}
        
        {files.length > 0 && (
          <div className="drag-hint">
            <span role="img" aria-label="drag" style={{ marginRight: '5px' }}>👉</span>
            Drag images directly to webviews and tools
            <span role="img" aria-label="drop" style={{ marginLeft: '5px' }}>🎯</span>
          </div>
        )}
        
        {!isFileSystemAccessSupported() && (
          <Alert variant="warning" className="mt-3">
            Your browser doesn't support direct folder access. Try Chrome or Edge for best experience.
          </Alert>
        )}
      </div>
    );
  };

  return viewMode === 'modal' ? renderModalView() : renderPanelView();
};

// Export the wrapper instead of the component directly
export default MediaLibraryWrapper; 