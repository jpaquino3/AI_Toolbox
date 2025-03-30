import React, { useState, useEffect } from 'react';
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
    if (!handle) return;
    
    try {
      setError(null);
      const fileHandles = [];
      
      // Get all file entries in the directory
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.match(/\.(jpe?g|png|gif|bmp|webp)$/i)) {
          fileHandles.push(entry);
        }
      }
      
      // Process file handles and create file objects
      const filePromises = fileHandles.map(async fileHandle => {
        const file = await fileHandle.getFile();
        const url = URL.createObjectURL(file);
        
        return {
          id: `${handle.name}-${fileHandle.name}`,
          name: fileHandle.name,
          url: url,
          fileHandle: fileHandle,
          file: file,
          type: file.type
        };
      });
      
      const loadedFiles = await Promise.all(filePromises);
      setFiles(loadedFiles);
      setFolderHandle(handle);
      setCurrentFolder(handle.name);
      
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
      if (!isFileSystemAccessSupported()) {
        setError('Your browser does not support the File System Access API. Please use Chrome, Edge, or another browser with this feature enabled.');
        return;
      }
      
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

  const handleUploadImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const filePromises = Array.from(e.target.files).map(file => 
          new Promise((resolve) => {
            const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            resolve({
              id: id,
              name: file.name,
              url: URL.createObjectURL(file), // Use blob URL for display
              file: file, // keep the original file for drag operations
              type: file.type
            });
          })
        );
        
        Promise.all(filePromises).then(newFiles => {
          setFiles(prev => [...prev, ...newFiles]);
          setError(null);
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
    try {
      // Set drag effect
      e.dataTransfer.effectAllowed = 'copy';
      
      // Set data for the drag operation
      e.dataTransfer.clearData();
      
      if (file.file) {
        // If we have a File object, use it
        e.dataTransfer.setData('text/plain', file.name);
        e.dataTransfer.items.add(file.file);
      } else if (file.url) {
        // Otherwise just use the URL
        e.dataTransfer.setData('text/plain', file.url);
        e.dataTransfer.setData('text/uri-list', file.url);
      }
      
      // Create a ghost image
      const ghostImage = new Image();
      ghostImage.src = file.url;
      ghostImage.onload = () => {
        e.dataTransfer.setDragImage(ghostImage, 10, 10);
      };
    } catch (error) {
      console.error('Error in handleDragStart:', error);
      // Fallback to basic text
      e.dataTransfer.setData('text/plain', file.name || 'image');
    }
  };

  const handleImageClick = (file) => {
    onSelect && onSelect(file);
  };

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
              {isProd && (
                <Button variant="danger" onClick={handleResetKeybindings} className="ms-2">
                  Reset Keyboard Shortcuts
                </Button>
              )}
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
          {isProd && (
            <Button size="sm" variant="outline-danger" onClick={handleResetKeybindings}>
              Reset Shortcuts
            </Button>
          )}
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
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
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
        
        {files.length > 0 && (
          <div className="drag-hint">
            Drag images from here to your AI tools
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