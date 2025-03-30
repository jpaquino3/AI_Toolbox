// webviewPreload.js - Preload script for webviews to enhance persistence

// Ensure we have the ipcRenderer object
const ipcRenderer = window.electron?.ipcRenderer || { 
  send: () => console.warn('ipcRenderer.send not available'),
  on: () => console.warn('ipcRenderer.on not available') 
};

// Prevent throttling and visibility issues
document.addEventListener('DOMContentLoaded', () => {
  // Register this webview with main process
  try {
    ipcRenderer.send('register-webview-session', window.name);
  } catch (error) {
    console.error('Error registering webview session:', error);
  }
  
  // Force visibility state to 'visible' to keep things running
  Object.defineProperty(document, 'visibilityState', {
    get: function() {
      return 'visible';
    }
  });
  
  Object.defineProperty(document, 'hidden', {
    get: function() {
      return false;
    }
  });
  
  // Override visibility change events
  const originalAddEventListener = document.addEventListener;
  document.addEventListener = function(type, listener, options) {
    if (type === 'visibilitychange') {
      // Don't actually add visibility change listeners
      return;
    }
    return originalAddEventListener.call(document, type, listener, options);
  };
  
  // Preserve form data
  const preserveFormData = () => {
    try {
      // Get all form elements
      const forms = document.querySelectorAll('form');
      const formData = {};
      
      // For each form, collect input values
      forms.forEach((form, formIndex) => {
        const formId = form.id || `form-${formIndex}`;
        formData[formId] = {};
        
        // Text inputs, textareas, selects
        form.querySelectorAll('input, textarea, select').forEach(input => {
          if (input.name || input.id) {
            const inputId = input.name || input.id;
            if (input.type === 'checkbox' || input.type === 'radio') {
              formData[formId][inputId] = input.checked;
            } else {
              formData[formId][inputId] = input.value;
            }
          }
        });
      });
      
      // Save to sessionStorage
      sessionStorage.setItem('preservedFormData', JSON.stringify(formData));
    } catch (error) {
      console.error('Error preserving form data:', error);
    }
  };
  
  // Restore form data
  const restoreFormData = () => {
    try {
      const savedData = sessionStorage.getItem('preservedFormData');
      if (savedData) {
        const formData = JSON.parse(savedData);
        
        // For each saved form, find the matching form and restore values
        Object.keys(formData).forEach(formId => {
          const form = document.getElementById(formId) || 
                       document.querySelector(`form[name="${formId}"]`) || 
                       document.querySelectorAll('form')[parseInt(formId.split('-')[1], 10)];
          
          if (form) {
            const formInputs = formData[formId];
            
            // Restore each input value
            Object.keys(formInputs).forEach(inputId => {
              const input = form.querySelector(`[name="${inputId}"]`) || 
                           form.querySelector(`#${inputId}`);
              
              if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                  input.checked = formInputs[inputId];
                } else {
                  input.value = formInputs[inputId];
                }
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  };
  
  // Save scroll position
  const preserveScrollPosition = () => {
    try {
      const scrollData = {
        x: window.scrollX,
        y: window.scrollY
      };
      sessionStorage.setItem('preservedScrollPosition', JSON.stringify(scrollData));
    } catch (error) {
      console.error('Error preserving scroll position:', error);
    }
  };
  
  // Restore scroll position
  const restoreScrollPosition = () => {
    try {
      const savedPosition = sessionStorage.getItem('preservedScrollPosition');
      if (savedPosition) {
        const scrollData = JSON.parse(savedPosition);
        window.scrollTo(scrollData.x, scrollData.y);
      }
    } catch (error) {
      console.error('Error restoring scroll position:', error);
    }
  };
  
  // Make these functions globally available
  window.preserveFormData = preserveFormData;
  window.restoreFormData = restoreFormData;
  window.preserveScrollPosition = preserveScrollPosition;
  window.restoreScrollPosition = restoreScrollPosition;
  
  // Execute restoration when page is loaded
  restoreFormData();
  setTimeout(restoreScrollPosition, 500); // Slight delay to ensure page layout is ready
  
  // Save state periodically
  setInterval(() => {
    preserveFormData();
    preserveScrollPosition();
  }, 5000); // Every 5 seconds
  
  // Save when page is about to unload
  window.addEventListener('beforeunload', () => {
    preserveFormData();
    preserveScrollPosition();
  });
});

// Listen for save-state requests from main process
try {
  ipcRenderer.on('save-tool-states', () => {
    try {
      // Trigger all saving functions
      if (window.preserveFormData) window.preserveFormData();
      if (window.preserveScrollPosition) window.preserveScrollPosition();
    } catch (e) {
      console.error('Error saving tool state:', e);
    }
  });
} catch (error) {
  console.error('Error setting up save-tool-states listener:', error);
}

// Add helper functions for handling image drops
window.handleImageDrop = function(imageUrl, imageName) {
  console.log('WebviewPreload: Handling image drop', imageName);
  
  // Create a global object to store image data
  window._droppedImageData = {
    url: imageUrl,
    name: imageName,
    timestamp: Date.now()
  };
  
  // Try to find file inputs
  const fileInputs = document.querySelectorAll('input[type="file"]');
  if (fileInputs.length > 0) {
    console.log('WebviewPreload: Found file inputs');
    
    // Show notification
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    notification.textContent = 'Click a highlighted upload button to use the image';
    document.body.appendChild(notification);
    
    // Remove after 6 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 6000);
    
    // Highlight file inputs
    fileInputs.forEach(input => {
      const originalOutline = input.style.outline;
      const originalBoxShadow = input.style.boxShadow;
      
      input.style.outline = '2px solid #4f46e5';
      input.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.4)';
      
      // Try to find the parent button or div that might be the actual clickable element
      let parent = input;
      for (let i = 0; i < 3; i++) {
        parent = parent.parentElement;
        if (parent && (
          parent.tagName === 'BUTTON' || 
          parent.role === 'button' ||
          window.getComputedStyle(parent).cursor === 'pointer'
        )) {
          parent.style.outline = '2px solid #4f46e5';
          parent.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.4)';
          break;
        }
      }
      
      // Restore original styles after 5 seconds
      setTimeout(() => {
        input.style.outline = originalOutline;
        input.style.boxShadow = originalBoxShadow;
        if (parent !== input) {
          parent.style.outline = '';
          parent.style.boxShadow = '';
        }
      }, 5000);
    });
  }
};

// Create a custom event to notify when an image is received
window.notifyImageReceived = function(imageData) {
  const event = new CustomEvent('aifm-image-received', { 
    detail: imageData,
    bubbles: true 
  });
  document.dispatchEvent(event);
};

// Add global event listeners for drag and drop
document.addEventListener('DOMContentLoaded', () => {
  console.log('WebviewPreload: Adding drag and drop event listeners');
  
  // Check if we already have image data from the parent window
  if (window._tempDroppedImage) {
    console.log('WebviewPreload: Found dropped image data', window._tempDroppedImage);
    window.handleImageDrop(window._tempDroppedImage.url, window._tempDroppedImage.name);
    window.notifyImageReceived(window._tempDroppedImage);
  }
});

// Fetch stored image from sessionStorage and convert to a usable File object
function createFileFromSessionStorage() {
  try {
    // Get the stored image data
    const base64Data = sessionStorage.getItem('aifm-last-dragged-image');
    const fileName = sessionStorage.getItem('aifm-last-dragged-image-name') || 'image.png';
    const mimeType = sessionStorage.getItem('aifm-last-dragged-image-type') || 'image/png';
    
    if (!base64Data) {
      console.log('No image data found in sessionStorage');
      return null;
    }
    
    // Convert base64 to blob
    const byteString = atob(base64Data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeType });
    
    // Create a File object
    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    console.error('Error creating file from sessionStorage:', error);
    return null;
  }
}

// Enhanced direct drag and drop to webpage support
document.addEventListener('DOMContentLoaded', () => {
  console.log('WebviewPreload: Setting up enhanced drag and drop');
  
  // First check if we have an image file in sessionStorage
  const imageFile = createFileFromSessionStorage();
  if (imageFile) {
    console.log('Found image in sessionStorage:', imageFile.name);
    window._droppedImageFile = imageFile;
  }
  
  // Create a function to intercept and handle drop events on website elements
  function enhanceDropZones() {
    // Find all potential drop zones (inputs, textareas, content editables, etc)
    const dropZones = [
      ...document.querySelectorAll('input[type="file"]'),
      ...document.querySelectorAll('div[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('[role="textbox"]'),
      ...document.querySelectorAll('div.drop-zone'),
      ...document.querySelectorAll('button')
    ];
    
    console.log('WebviewPreload: Found ' + dropZones.length + ' potential drop zones');
    
    // Add click handler for any potential drop zones
    dropZones.forEach(zone => {
      if (zone.getAttribute('data-aifm-enhanced')) return;
      
      zone.setAttribute('data-aifm-enhanced', 'true');
      
      // Add a subtle identifier on hover if we have an image pending
      zone.addEventListener('mouseover', () => {
        if (window._pendingImageData || window._droppedImageData || window._tempDroppedImage || window._droppedImageFile) {
          // Save original styles
          if (!zone._originalBorder) {
            zone._originalBorder = zone.style.border;
            zone._originalOutline = zone.style.outline;
            zone._originalBoxShadow = zone.style.boxShadow;
          }
          
          // Apply highlight
          zone.style.outline = '2px solid #4f46e5';
          zone.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
          
          // Only show hint for file inputs
          if (zone.tagName === 'INPUT' && zone.type === 'file') {
            // Add a hint that this is where to upload the image
            if (!document.getElementById('aifm-upload-hint')) {
              const hint = document.createElement('div');
              hint.id = 'aifm-upload-hint';
              hint.style.position = 'fixed';
              hint.style.backgroundColor = '#4f46e5';
              hint.style.color = 'white';
              hint.style.padding = '5px 10px';
              hint.style.borderRadius = '4px';
              hint.style.zIndex = '10000';
              hint.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
              hint.style.fontSize = '12px';
              hint.style.pointerEvents = 'none';
              hint.textContent = 'Click to use your image';
              
              // Position hint near the element
              const rect = zone.getBoundingClientRect();
              hint.style.top = (rect.top - 30) + 'px';
              hint.style.left = (rect.left + rect.width/2 - 60) + 'px';
              
              document.body.appendChild(hint);
            }
          }
        }
      });
      
      // Remove highlight when not hovering
      zone.addEventListener('mouseout', () => {
        if (zone._originalBorder !== undefined) {
          zone.style.border = zone._originalBorder;
          zone.style.outline = zone._originalOutline;
          zone.style.boxShadow = zone._originalBoxShadow;
        }
        
        // Remove the hint
        const hint = document.getElementById('aifm-upload-hint');
        if (hint) {
          document.body.removeChild(hint);
        }
      });
      
      // Handle click on potential upload areas when we have a pending image
      zone.addEventListener('click', () => {
        // Try to get the image data from any available source
        const imageData = window._pendingImageData || window._droppedImageData || window._tempDroppedImage;
        const imageFile = window._droppedImageFile || createFileFromSessionStorage();
        
        if (!imageData && !imageFile) return;
        
        console.log('WebviewPreload: Click on potential drop zone with pending image', zone.tagName);
        
        // For file inputs, try to directly set the files if we have an actual file
        if (zone.tagName === 'INPUT' && zone.type === 'file' && imageFile) {
          try {
            // Create a DataTransfer object and add our file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(imageFile);
            
            // Set the files property directly if possible
            zone.files = dataTransfer.files;
            
            // Dispatch change event
            zone.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('Successfully set file on input element');
            
            // Show success notification
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = '#059669';
            notification.style.color = 'white';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            notification.textContent = 'Image uploaded successfully!';
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 3000);
            
            return;
          } catch (err) {
            console.error('Error setting file directly:', err);
            
            // If direct file setting fails, show a help notification
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '20%';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '15px 25px';
            notification.style.borderRadius = '8px';
            notification.style.zIndex = '10000';
            notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            notification.style.maxWidth = '80%';
            notification.style.textAlign = 'center';
            
            // Create helper text
            notification.innerHTML = '<div style="font-weight: bold; margin-bottom: 10px;">Select the Image Manually</div>';
            notification.innerHTML += '<div style="margin-bottom: 15px;">In the file dialog that just opened, select the most recent image from your Downloads folder</div>';
            
            document.body.appendChild(notification);
            
            // Remove after 8 seconds
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 8000);
          }
        }
        
        // For rich text editors, try to insert the image directly
        if (zone.getAttribute('contenteditable') === 'true') {
          if (imageData && imageData.url) {
            try {
              // Insert the image into the contenteditable
              const imgHtml = `<img src="${imageData.url}" alt="${imageData.name || 'Image'}" style="max-width: 100%;">`;
              document.execCommand('insertHTML', false, imgHtml);
              console.log('Inserted image into contenteditable');
              return;
            } catch (err) {
              console.error('Error inserting image into contenteditable:', err);
            }
          }
          
          // Fallback to text message
          const originalHTML = zone.innerHTML;
          zone.innerHTML = originalHTML + '<p>I have an image to share. How can I upload it?</p>';
          
          // Trigger input event
          zone.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Focus the element
          zone.focus();
        }
        
        // For textareas, insert text
        if (zone.tagName === 'TEXTAREA') {
          const originalValue = zone.value;
          zone.value = originalValue + '\n\nI have an image to share. How can I upload it?';
          
          // Trigger input event to ensure the UI updates
          zone.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Focus the element
          zone.focus();
        }
      });
    });
    
    // Check for and handle Paperclip/Attachment buttons in common chat applications
    const potentialUploadButtons = [
      // ChatGPT attachment button
      document.querySelector('button[aria-label="Attach files"]'),
      // Claude attachment button (has SVG with paperclip)
      ...Array.from(document.querySelectorAll('button')).filter(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.innerHTML.includes('path') && 
              (btn.getAttribute('aria-label')?.toLowerCase().includes('file') ||
               btn.getAttribute('aria-label')?.toLowerCase().includes('attach') ||
               btn.getAttribute('aria-label')?.toLowerCase().includes('upload'));
      })
    ].filter(Boolean); // Remove null/undefined items
    
    if (potentialUploadButtons.length > 0) {
      console.log('Found potential upload buttons:', potentialUploadButtons.length);
      
      // Highlight them with a distinct style to make them obvious
      potentialUploadButtons.forEach(btn => {
        if (btn.getAttribute('data-aifm-upload-enhanced')) return;
        
        btn.setAttribute('data-aifm-upload-enhanced', 'true');
        
        // Original styles
        if (!btn._originalOutline) {
          btn._originalOutline = btn.style.outline;
          btn._originalBoxShadow = btn.style.boxShadow;
        }
        
        // Make this button very obvious if we have a pending image
        if (window._pendingImageData || window._droppedImageData || window._tempDroppedImage || window._droppedImageFile || sessionStorage.getItem('aifm-last-dragged-image')) {
          // Add pulsing effect
          btn.style.outline = '2px solid #4f46e5';
          btn.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.4)';
          btn.style.animation = 'pulse 1.5s infinite';
          
          // Add a large hint
          const rect = btn.getBoundingClientRect();
          const hint = document.createElement('div');
          hint.textContent = '👉 CLICK HERE TO UPLOAD YOUR IMAGE 👈';
          hint.style.position = 'absolute';
          hint.style.top = (rect.top - 40) + 'px';
          hint.style.left = (rect.left + rect.width/2 - 120) + 'px';
          hint.style.backgroundColor = '#4f46e5';
          hint.style.color = 'white';
          hint.style.padding = '8px 12px';
          hint.style.borderRadius = '6px';
          hint.style.fontSize = '14px';
          hint.style.fontWeight = 'bold';
          hint.style.zIndex = '10000';
          hint.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
          hint.style.pointerEvents = 'none';
          document.body.appendChild(hint);
          
          // Remove after 10 seconds
          setTimeout(() => {
            btn.style.outline = btn._originalOutline || '';
            btn.style.boxShadow = btn._originalBoxShadow || '';
            btn.style.animation = '';
            
            if (document.body.contains(hint)) {
              document.body.removeChild(hint);
            }
          }, 10000);
        }
      });
    }
  }
  
  // Run the enhancement initially and periodically (for dynamic sites)
  enhanceDropZones();
  setInterval(enhanceDropZones, 2000);
  
  // Handle MutationObserver for dynamic sites
  const observer = new MutationObserver((mutations) => {
    let shouldEnhance = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        shouldEnhance = true;
      }
    });
    
    if (shouldEnhance) {
      enhanceDropZones();
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

// Add support for direct image clipboard operations
document.addEventListener('DOMContentLoaded', () => {
  console.log('WebviewPreload: Setting up clipboard support');
  
  // Check if we have a stored image from a drag operation
  const storedImage = window.sessionStorage.getItem('aifm-last-dragged-image');
  const storedImageName = window.sessionStorage.getItem('aifm-last-dragged-image-name');
  const storedImageType = window.sessionStorage.getItem('aifm-last-dragged-image-type');
  const timestamp = window.sessionStorage.getItem('aifm-last-dragged-timestamp');
  
  // Only process images that are recent (less than 10 seconds old)
  const now = Date.now();
  const isRecent = timestamp && (now - parseInt(timestamp)) < 10000;
  
  if (storedImage && isRecent) {
    console.log('Found stored image in sessionStorage:', storedImageName);
    
    // Make sure we have the clipboard API helper function
    if (!window.writeImageToClipboard) {
      window.writeImageToClipboard = async function(dataUrl) {
        try {
          // Convert dataURL to blob
          const fetchResult = await fetch(dataUrl);
          const blob = await fetchResult.blob();
          
          // Create a ClipboardItem
          const item = new ClipboardItem({ 
            [blob.type]: blob 
          });
          
          // Write to clipboard
          await navigator.clipboard.write([item]);
          console.log('Image written to clipboard successfully');
          return true;
        } catch (error) {
          console.error('Failed to write image to clipboard:', error);
          return false;
        }
      };
    }
    
    // Add a global paste handler to help with pasting the image
    window.addEventListener('keydown', function(e) {
      // Check for Ctrl+V or Command+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        console.log('Paste shortcut detected');
        
        // Find focused text input or contenteditable
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' || 
                        activeElement.tagName === 'TEXTAREA' || 
                        activeElement.getAttribute('contenteditable') === 'true';
        
        if (isInput && window._droppedImageFile) {
          console.log('Focused element is input, trying to paste stored image');
          
          // Create a paste event with our image data
          try {
            // Actually this likely won't work due to browser security,
            // but we can use this to detect paste attempts and show a helper
            
            // Show a helper notification about pasting
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '15px 25px';
            notification.style.borderRadius = '8px';
            notification.style.zIndex = '10000';
            notification.style.maxWidth = '80%';
            notification.style.textAlign = 'center';
            notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            
            notification.innerHTML = '<div style="font-weight: bold; margin-bottom: 10px;">Image Ready to Paste</div>';
            notification.innerHTML += '<div>The image is in your clipboard - press Ctrl+V or Command+V again to paste</div>';
            
            document.body.appendChild(notification);
            
            // Remove after 4 seconds
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 4000);
          } catch (err) {
            console.error('Error creating paste event:', err);
          }
        }
      }
    });
    
    // Try to write the image to clipboard when page loads
    if (window.writeImageToClipboard) {
      window.writeImageToClipboard(storedImage)
        .then(success => {
          if (success) {
            console.log('Successfully wrote image to clipboard on page load');
            
            // Create a File object for later use
            try {
              const response = fetch(storedImage)
                .then(res => res.blob())
                .then(blob => {
                  // Create File object
                  const file = new File([blob], storedImageName || 'image.png', { 
                    type: storedImageType || 'image/png' 
                  });
                  
                  // Store for later use
                  window._droppedImageFile = file;
                  
                  // Show a subtle notification that image is ready
                  const notification = document.createElement('div');
                  notification.style.position = 'fixed';
                  notification.style.bottom = '20px';
                  notification.style.right = '20px';
                  notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                  notification.style.color = 'white';
                  notification.style.padding = '10px 15px';
                  notification.style.borderRadius = '5px';
                  notification.style.zIndex = '9999';
                  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                  notification.style.fontSize = '14px';
                  notification.textContent = 'Press Ctrl+V (or Cmd+V) to paste your image';
                  
                  document.body.appendChild(notification);
                  
                  setTimeout(() => {
                    if (document.body.contains(notification)) {
                      document.body.removeChild(notification);
                    }
                  }, 5000);
                });
            } catch (err) {
              console.error('Error creating file from blob:', err);
            }
          }
        })
        .catch(err => {
          console.error('Error writing to clipboard:', err);
        });
    }
  }
});

// Override the enhanceDropZones function to auto-click file inputs when a file is available
document.addEventListener('DOMContentLoaded', () => {
  const originalEnhanceDropZones = window.enhanceDropZones;
  
  if (typeof originalEnhanceDropZones === 'function') {
    // Replace with enhanced version
    window.enhanceDropZones = function() {
      // Call original function
      originalEnhanceDropZones();
      
      // Additionally, find all file inputs and try to auto-click the most likely candidate
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      // Check if we have a file ready to use
      if (window._droppedImageFile && fileInputs.length > 0) {
        console.log('Found file inputs and we have a ready file, trying to auto-click');
        
        // Find the most prominent file input
        let bestInput = null;
        let bestScore = -1;
        
        fileInputs.forEach(input => {
          // Only process visible inputs
          if (input.offsetParent === null) return;
          
          let score = 0;
          
          // Check if accepts images
          if (input.accept && (
            input.accept.includes('image') || 
            input.accept.includes('jpg') ||
            input.accept.includes('png')
          )) {
            score += 5;
          }
          
          // Check position (prefer inputs closer to the top/center)
          const rect = input.getBoundingClientRect();
          if (rect.top < window.innerHeight / 2) {
            score += 3;
          }
          
          // Check if there's text nearby about uploading
          const parent = input.parentElement;
          if (parent && parent.textContent && (
            parent.textContent.toLowerCase().includes('upload') ||
            parent.textContent.toLowerCase().includes('image') ||
            parent.textContent.toLowerCase().includes('file')
          )) {
            score += 4;
          }
          
          // Check if it has siblings that look like buttons
          const siblings = Array.from(parent?.children || []);
          if (siblings.some(sib => 
            sib.tagName === 'BUTTON' || 
            (sib.tagName === 'DIV' && window.getComputedStyle(sib).cursor === 'pointer')
          )) {
            score += 3;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestInput = input;
          }
        });
        
        // If we found a good candidate, auto-click it
        if (bestInput && bestScore > 3) {
          console.log('Found best file input candidate with score', bestScore);
          
          // Highlight the input to make it obvious
          bestInput.style.outline = '3px solid #4f46e5';
          bestInput.style.boxShadow = '0 0 0 5px rgba(79, 70, 229, 0.4)';
          
          // Try to simulate a click
          setTimeout(() => {
            try {
              bestInput.click();
              console.log('Auto-clicked file input');
            } catch (err) {
              console.error('Error auto-clicking file input:', err);
            }
          }, 1000);
        }
      }
    };
    
    // Run the enhanced version now
    window.enhanceDropZones();
  }
});

// Add support for parent window keyboard shortcuts with highest priority
document.addEventListener('DOMContentLoaded', () => {
  console.log('WebviewPreload: Setting up high-priority keyboard shortcut passthrough');

  // Initialize local keybindings cache
  window._registeredKeybindings = {};

  // Super aggressive keyboard event capture
  function captureAllKeyboardEvents(e) {
    // First check if this is a modifier keybinding (we want to handle ALL keyboard events with modifiers)
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
      console.log('WebviewPreload: INTERCEPTING keyboard event with modifiers:', e.key, e.code);
      
      // Store original key event data
      const keyData = {
        key: e.key,
        code: e.code,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey
      };
      
      // Check if this matches any of our registered keybindings
      let isRegisteredShortcut = false;
      
      // If we have _registeredKeybindings data, check against it
      if (window._registeredKeybindings && Object.keys(window._registeredKeybindings).length > 0) {
        const keys = Object.values(window._registeredKeybindings).filter(Boolean);
        
        // Normalize the current key for comparison
        let normalizedKey = e.key.toUpperCase();
        if (e.key === ' ') normalizedKey = 'SPACE';
        else if (e.key === 'ArrowUp') normalizedKey = 'UP';
        else if (e.key === 'ArrowDown') normalizedKey = 'DOWN';
        else if (e.key === 'ArrowLeft') normalizedKey = 'LEFT';
        else if (e.key === 'ArrowRight') normalizedKey = 'RIGHT';
        
        // Check each keybinding
        for (const binding of keys) {
          if (!binding) continue;
          
          // Split the binding into modifiers and key
          const parts = binding.split('+');
          const keyFromBinding = parts.pop().toUpperCase();
          const modifiers = new Set(parts);
          
          // Check if key matches
          const keyMatches = 
            normalizedKey === keyFromBinding || 
            (e.code === `Key${keyFromBinding}`) || 
            (e.code === `Digit${keyFromBinding}`) ||
            (e.code.startsWith('Digit') && e.code.charAt(5) === keyFromBinding);
          
          // Check if modifiers match
          const modifiersMatch = 
            (modifiers.has('Cmd') === e.metaKey) &&
            (modifiers.has('Ctrl') === e.ctrlKey) &&
            (modifiers.has('Alt') === e.altKey) &&
            (modifiers.has('Shift') === e.shiftKey);
          
          if (keyMatches && modifiersMatch) {
            isRegisteredShortcut = true;
            console.log('MATCHED REGISTERED KEYBINDING');
            break;
          }
        }
      }
      
      // IMPORTANT: Always check for common shortcut patterns as a fallback
      const isLikelyShortcut = isRegisteredShortcut || (
        // Command/Control + letter 
        ((e.metaKey || e.ctrlKey) && e.key.length === 1 && e.key.match(/[a-z]/i)) ||
        // Alt + anything
        (e.altKey) ||
        // Command/Control + number or arrow key or space
        ((e.metaKey || e.ctrlKey) && (
          e.code.startsWith('Digit') || 
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)
        ))
      );
      
      // USE ALL AVAILABLE COMMUNICATION CHANNELS
      
      // Method 1: Custom Event
      document.dispatchEvent(new CustomEvent('aifm-keydown-passthrough', {
        detail: keyData,
        bubbles: true,
        cancelable: true
      }));
      
      // Method 2: postMessage
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'aifm-keydown-passthrough',
            detail: keyData
          }, '*');
        }
      } catch (err) { /* Ignore errors */ }
      
      // Method 3: Direct function call
      try {
        if (window.parent && window.parent._processToolKeyboardEvent) {
          window.parent._processToolKeyboardEvent(keyData);
        } 
      } catch (err) { /* Ignore errors */ }
      
      // ALWAYS prevent default and stop propagation for likely shortcuts
      if (isLikelyShortcut) {
        console.log('PREVENTING DEFAULT for likely shortcut or registered keybinding');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }
  
  // First capture all events at the window level
  window.addEventListener('keydown', captureAllKeyboardEvents, true);
  
  // Then also capture at the document level for redundancy
  document.addEventListener('keydown', captureAllKeyboardEvents, true);
  
  // Expose function to receive keybindings from parent
  window._receiveKeybindingCheck = function(keybindings) {
    // Only log in development mode
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('Received keybindings from parent:', keybindings);
    }
    window._registeredKeybindings = keybindings;
  };
  
  // For extra coverage, check parent document periodically for keybindings
  function requestKeybindings() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'aifm-keybinding-request',
          source: window.location.href
        }, '*');
      }
    } catch (err) { /* Ignore errors */ }
  }
  
  // Request keybindings immediately and every 3 seconds
  requestKeybindings();
  setInterval(requestKeybindings, 10000); // Reduced from 3 seconds to 10 seconds
  
  // Create a MutationObserver to handle dynamically-added iframes
  const observer = new MutationObserver((mutations) => {
    // Debounce mutation handling to avoid excessive processing
    clearTimeout(observer.debounceTimer);
    observer.debounceTimer = setTimeout(() => {
      // Process mutations in a batch
      let hasNewIframes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes) {
          for (const node of mutation.addedNodes) {
            if (node.tagName === 'IFRAME') {
              hasNewIframes = true;
              try {
                // Try to access the iframe's contentWindow to inject our script
                if (node.contentWindow && node.contentWindow.document) {
                  injectKeyboardHandlerToIframe(node);
                }
              } catch (err) { /* Ignore errors */ }
            }
          }
        }
      }
      
      // Only log if we found new iframes
      if (hasNewIframes && process.env.NODE_ENV === 'development') {
        console.log('Injected keyboard handlers to new iframes');
      }
    }, 500); // Wait 500ms before processing mutations
  });
  
  // Inject keyboard handler to child iframes
  function injectKeyboardHandlerToIframe(iframe) {
    try {
      if (!iframe.contentWindow || !iframe.contentDocument) return;
      
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          // Capture keyboard events at the window level
          window.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
              console.log('Nested iframe intercepting keyboard event:', e.key);
              
              // Forward to parent
              window.parent.postMessage({
                type: 'aifm-keydown-passthrough',
                detail: {
                  key: e.key,
                  code: e.code,
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                  shiftKey: e.shiftKey
                }
              }, '*');
              
              // Always prevent default for modifier key combinations in nested iframes
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              return false;
            }
          }, true);
        })();
      `;
      
      iframe.contentDocument.head.appendChild(script);
      console.log('Injected keyboard handler to iframe:', iframe.src);
    } catch (err) {
      console.error('Error injecting to iframe:', err);
    }
  }
  
  // Find and inject to all existing iframes
  function injectToAllNestedIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      injectKeyboardHandlerToIframe(iframe);
    });
  }
  
  // Start observing the document for added iframes
  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
  });
  
  // Initial injection to existing iframes
  injectToAllNestedIframes();
  
  // Re-check periodically for iframes that might have loaded later
  setInterval(injectToAllNestedIframes, 8000); // Reduced from 2 seconds to 8 seconds
}); 