import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import textIcon from '../assets/icons/text.svg';
import imageIcon from '../assets/icons/image.svg';
import videoIcon from '../assets/icons/video.svg';
import audioIcon from '../assets/icons/audio.svg';
import otherIcon from '../assets/icons/other.svg';

// Inline styles for WebViewPage
const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  headerBlue: {
    backgroundColor: '#2563eb',
    color: 'white',
  },
  headerGreen: {
    backgroundColor: '#059669',
    color: 'white',
  },
  headerRed: {
    backgroundColor: '#dc2626',
    color: 'white',
  },
  headerAmber: {
    backgroundColor: '#d97706',
    color: 'white',
  },
  headerPurple: {
    backgroundColor: '#7c3aed',
    color: 'white',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  button: {
    padding: '0.25rem',
    marginRight: '0.25rem',
    borderRadius: '0.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'white',
  },
  buttonHover: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  urlBar: {
    padding: '0.25rem 0.75rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '0.375rem',
    flex: 1,
    maxWidth: '32rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '0.875rem',
  },
  toolInfo: {
    paddingLeft: '1rem',
    display: 'flex',
    alignItems: 'center',
  },
  toolIcon: {
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '0.5rem',
  },
  loadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '0.25rem',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    zIndex: 10,
  },
  loadingIndicator: {
    height: '100%',
    width: '100%',
    animation: 'pulse 1.5s infinite',
  },
  webviewContainer: {
    flex: 1,
    display: 'flex',
    position: 'relative',
  },
  webview: {
    display: 'inline-flex',
    flex: 1,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  webviewHidden: {
    display: 'none',
  },
  errorMessage: {
    position: 'absolute',
    top: '3rem',
    left: 0,
    right: 0,
    margin: '0 auto',
    width: '100%',
    maxWidth: '28rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#b91c1c',
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
    zIndex: 50,
  },
  loadingScreen: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    fontSize: '1.25rem',
    color: '#4b5563',
  }
};

// Add these styles for drag and drop
const dropStyles = {
  dropZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none',
    backgroundColor: 'rgba(79, 70, 229, 0.15)'
  },
  dropMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '20px 40px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  dropSubtext: {
    fontSize: '14px',
    fontWeight: 'normal',
    marginTop: '8px'
  },
  activeDrop: {
    border: '3px dashed #4f46e5',
    boxShadow: 'inset 0 0 30px rgba(79, 70, 229, 0.2)'
  }
};

const WebViewPage = ({ aiTools }) => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const webviewRefs = useRef({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentTool, setCurrentTool] = useState(null);
  const [url, setUrl] = useState('');
  const [toolType, setToolType] = useState('');
  const [error, setError] = useState(null);
  const [hoverState, setHoverState] = useState({});
  const [favicon, setFavicon] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [energySaver, setEnergySaver] = useState(false);
  
  // Find tool based on toolId or direct aiTools prop
  useEffect(() => {
    // If only one tool is passed directly (for split-screen mode)
    if (aiTools.length === 1) {
      const tool = aiTools[0];
      setCurrentTool(tool);
      setUrl(tool.url);
      
      // Determine the tool type for styling
      if (tool.id.includes('chat') || tool.id.includes('claude') || tool.id.includes('perplexity')) {
        setToolType('llm');
      } else if (tool.id.includes('journey') || tool.id.includes('leonardo') || tool.id.includes('stability') || tool.id.includes('dalle')) {
        setToolType('image');
      } else if (tool.id.includes('runway') || tool.id.includes('pika') || tool.id.includes('gen2')) {
        setToolType('video');
      } else if (tool.id.includes('eleven') || tool.id.includes('mubert') || tool.id.includes('sound')) {
        setToolType('audio');
      } else {
        setToolType('other');
      }
      
      // Try to get the favicon
      try {
        const urlObj = new URL(tool.url);
        // Get the hostname parts to handle subdomains properly
        const hostname = urlObj.hostname;
        
        // Try multiple common favicon locations
        const faviconOptions = [
          `${urlObj.protocol}//${hostname}/favicon.ico`,
          `${urlObj.protocol}//${hostname}/favicon.png`,
          `${urlObj.protocol}//${hostname}/apple-touch-icon.png`,
          `${urlObj.protocol}//${hostname}/apple-touch-icon-precomposed.png`,
          `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
        ];
        
        // Use the first option for now, the img onError will handle fallback
        setFavicon(faviconOptions[0]);
      } catch (error) {
        console.error('Error parsing URL for favicon:', error);
        setFavicon(null);
      }
      
      return;
    }
    
    // Otherwise, find tool by toolId from URL param
    const tool = aiTools.find(tool => tool.id === toolId);
    if (!tool) {
      navigate('/');
      return;
    }
    
    setCurrentTool(tool);
    setUrl(tool.url);
    
    // Determine the tool type for styling
    if (tool.id.includes('chat') || tool.id.includes('claude') || tool.id.includes('perplexity')) {
      setToolType('llm');
    } else if (tool.id.includes('journey') || tool.id.includes('leonardo') || tool.id.includes('stability') || tool.id.includes('dalle')) {
      setToolType('image');
    } else if (tool.id.includes('runway') || tool.id.includes('pika') || tool.id.includes('gen2')) {
      setToolType('video');
    } else if (tool.id.includes('eleven') || tool.id.includes('mubert') || tool.id.includes('sound')) {
      setToolType('audio');
    } else {
      setToolType('other');
    }
    
    // Try to get the favicon
    try {
      const urlObj = new URL(tool.url);
      // Get the hostname parts to handle subdomains properly
      const hostname = urlObj.hostname;
      
      // Try multiple common favicon locations
      const faviconOptions = [
        `${urlObj.protocol}//${hostname}/favicon.ico`,
        `${urlObj.protocol}//${hostname}/favicon.png`,
        `${urlObj.protocol}//${hostname}/apple-touch-icon.png`,
        `${urlObj.protocol}//${hostname}/apple-touch-icon-precomposed.png`,
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
      ];
      
      // Use the first option for now, the img onError will handle fallback
      setFavicon(faviconOptions[0]);
    } catch (error) {
      console.error('Error parsing URL for favicon:', error);
      setFavicon(null);
    }
  }, [toolId, aiTools, navigate]);

  // Listen for tool data reset events
  useEffect(() => {
    const handleToolReset = (event) => {
      const resetToolId = event.detail.toolId;
      
      // Only reload if this is the current tool
      if (resetToolId === toolId) {
        console.log(`Reloading webview for tool ${resetToolId}`);
        
        // Get the current webview
        const webview = getCurrentWebviewRef();
        if (webview) {
          // Clear any in-memory data and reload the webview
          try {
            // First set loading state
            setIsLoading(true);
            
            // Use stop/reload combination to ensure a fresh reload
            webview.stop();
            webview.reload();
            
            // For a more forceful reload, we can navigate to the URL again
            setTimeout(() => {
              if (currentTool && currentTool.url) {
                console.log(`Forcing navigation to ${currentTool.url}`);
                webview.loadURL(currentTool.url);
              }
            }, 100);
          } catch (err) {
            console.error('Error reloading webview:', err);
          }
        }
      }
    };
    
    // Listen for the custom event from Settings page
    window.addEventListener('reload-tool-webview', handleToolReset);
    
    // Listen for the direct event from Electron main process
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('tool-data-cleared', (event, clearedToolId) => {
        if (clearedToolId === toolId) {
          console.log(`Received IPC event to reload tool ${clearedToolId}`);
          
          // Create a synthetic event to use the same handler
          const syntheticEvent = {
            detail: { toolId: clearedToolId }
          };
          handleToolReset(syntheticEvent);
        }
      });
    }
    
    return () => {
      window.removeEventListener('reload-tool-webview', handleToolReset);
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeListener('tool-data-cleared');
      }
    };
  }, [toolId, currentTool]);
  
  // Inject keyboard event handlers with highest priority
  useEffect(() => {
    const disableNativeKeyboardShortcuts = () => {
      // Create a style element to inject CSS that disables native keyboard shortcuts
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        /* Override browser keyboard shortcuts */
        body * {
          -webkit-user-select: auto !important;
          user-select: auto !important;
        }
        
        /* This helps prevent the browser from handling certain key combinations */
        body, html {
          overscroll-behavior: contain !important;
        }
      `;
      document.head.appendChild(styleElement);
      
      return styleElement;
    };
    
    // Add direct event interceptor at the window level - highest priority
    const handleCaptureWindowKeydown = (e) => {
      // Only check for modifier keys as those are likely shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        console.log('GLOBAL WINDOW CAPTURE intercepted keydown:', e.key, e.code);
        
        // Dispatch custom event that our app.jsx will pick up
        document.dispatchEvent(new CustomEvent('aifm-keydown-passthrough', {
          detail: {
            key: e.key,
            code: e.code,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey
          },
          bubbles: true
        }));
      }
    };
    
    // Function to inject keyboard event script into an iframe with maximum prevention capabilities
    const injectKeyboardHandlers = (iframe) => {
      try {
        if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return;
        
        console.log('Injecting keyboard handlers into iframe');
        
        // First try adding an event listener on the iframe's content window
        try {
          iframe.contentWindow.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
              console.log('Direct iframe contentWindow event listener captured key:', e.key);
              
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation?.();
              
              // Forward to parent window
              parent.postMessage({
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
            }
          }, true);
        } catch (err) {
          console.error('Failed to add direct event listener:', err);
        }
        
        // Create a script element to inject into the iframe
        const script = document.createElement('script');
        script.textContent = `
          (function() {
            console.log('Super aggressive keyboard handler script injected into iframe');
            
            // Add script to disable all browser keyboard shortcuts
            const style = document.createElement('style');
            style.textContent = 'body * { -webkit-user-select: auto !important; user-select: auto !important; }';
            document.head.appendChild(style);
            
            // Direct keyboard handler with multiple prevention techniques
            function captureAllKeyboardEvents(e) {
              // Only check modifier keys as those are likely shortcuts
              if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
                console.log('Iframe captured keyboard event:', e.key, e.code);
                
                // Prevent default on the event
                e.preventDefault();
                e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                
                // Send to parent window using all available methods
                try {
                  // Method 1: postMessage
                  if (window.parent && window.parent !== window) {
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
                  }
                  
                  // Method 2: Direct function call if available
                  if (window.parent && window.parent._processToolKeyboardEvent) {
                    window.parent._processToolKeyboardEvent({
                      key: e.key,
                      code: e.code,
                      altKey: e.altKey,
                      ctrlKey: e.ctrlKey,
                      metaKey: e.metaKey,
                      shiftKey: e.shiftKey
                    });
                  }
                  
                  // Method 3: Custom event 
                  const customEvent = new CustomEvent('aifm-keydown-passthrough', {
                    detail: {
                      key: e.key,
                      code: e.code,
                      altKey: e.altKey,
                      ctrlKey: e.ctrlKey,
                      metaKey: e.metaKey,
                      shiftKey: e.shiftKey
                    },
                    bubbles: true,
                    cancelable: true
                  });
                  document.dispatchEvent(customEvent);
                } catch (err) {
                  console.error('Error forwarding keyboard event:', err);
                }
                
                return false;
              }
            }
            
            // Attach the handler to both window and document with capture
            window.addEventListener('keydown', captureAllKeyboardEvents, true);
            document.addEventListener('keydown', captureAllKeyboardEvents, true);
            
            // Find and process all nested iframes too
            function processNestedIframes() {
              const nestedIframes = document.querySelectorAll('iframe');
              console.log('Processing', nestedIframes.length, 'nested iframes');
              
              nestedIframes.forEach(iframe => {
                try {
                  if (iframe.contentDocument && iframe.contentWindow) {
                    // Add keyboard event listener directly to the iframe window
                    iframe.contentWindow.addEventListener('keydown', captureAllKeyboardEvents, true);
                    
                    // Add a script element to the iframe document
                    const nestedScript = document.createElement('script');
                    nestedScript.textContent = \`
                      window.addEventListener('keydown', function(e) {
                        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                          
                          // Send to parent
                          if (window.parent) {
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
                          }
                          return false;
                        }
                      }, true);
                    \`;
                    iframe.contentDocument.head.appendChild(nestedScript);
                  }
                } catch (err) {
                  console.error('Error processing nested iframe:', err);
                }
              });
            }
            
            // Initialize
            processNestedIframes();
            
            // Monitor for new iframes
            const observer = new MutationObserver(mutations => {
              let shouldProcess = false;
              
              for (const mutation of mutations) {
                if (mutation.addedNodes && mutation.addedNodes.length) {
                  for (const node of mutation.addedNodes) {
                    if (node.tagName === 'IFRAME' || 
                        (node.nodeType === 1 && node.querySelector('iframe'))) {
                      shouldProcess = true;
                      break;
                    }
                  }
                  if (shouldProcess) break;
                }
              }
              
              if (shouldProcess) {
                console.log('New iframes detected, processing...');
                processNestedIframes();
              }
            });
            
            // Start observing
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true
            });
            
            // Also periodically check for iframes
            setInterval(processNestedIframes, 2000);
          })();
        `;
        
        // Inject into the iframe
        if (iframe.contentDocument && iframe.contentDocument.head) {
          iframe.contentDocument.head.appendChild(script);
          console.log('Successfully injected super aggressive keyboard handlers');
        }
      } catch (err) {
        console.error('Error injecting keyboard handlers:', err);
      }
    };
    
    // Function to check all iframes and inject handlers
    const injectToAllIframes = () => {
      // Get all iframes in the current document
      const iframes = document.querySelectorAll('iframe');
      console.log(`Found ${iframes.length} iframes to inject keyboard handlers`);
      
      iframes.forEach(iframe => {
        injectKeyboardHandlers(iframe);
      });
    };
    
    // Add the style element to disable native shortcuts
    const styleElement = disableNativeKeyboardShortcuts();
    
    // Add the global window-level keyboard capture
    window.addEventListener('keydown', handleCaptureWindowKeydown, true);
    
    // Initial injection with a delay to ensure iframes are loaded
    const initialInjectionTimeout = setTimeout(injectToAllIframes, 1000);
    
    // Set up periodic injection to handle dynamically created iframes
    const injectionInterval = setInterval(injectToAllIframes, 3000);
    
    // Set up mutation observer to detect new iframes
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.tagName === 'IFRAME' || 
                (node.nodeType === 1 && node.querySelector('iframe'))) {
              shouldProcess = true;
              break;
            }
          }
          if (shouldProcess) break;
        }
      }
      
      if (shouldProcess) {
        console.log('Mutation observer detected new iframes');
        setTimeout(injectToAllIframes, 500);
      }
    });
    
    // Start observing the document for added iframes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Clean up
    return () => {
      clearTimeout(initialInjectionTimeout);
      clearInterval(injectionInterval);
      observer.disconnect();
      window.removeEventListener('keydown', handleCaptureWindowKeydown, true);
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [currentTool]);
  
  // Update URL when webview changes
  useEffect(() => {
    const handleDidNavigate = (e) => {
      console.log('Webview navigated to:', e.url);
      if (e.target.partition === `persist:${currentTool?.id}`) {
        setUrl(e.url);
      }
    };
    
    const handleDidStartLoading = () => {
      console.log('Webview started loading');
      setIsLoading(true);
    };
    
    const handleDidStopLoading = () => {
      console.log('Webview stopped loading');
      setIsLoading(false);
    };
    
    const handleError = (e) => {
      console.error('Webview error:', e);
      setIsLoading(false);
      setError('Failed to load page. Please check your internet connection and try again.');
    };
    
    // Global event listeners for all webviews
    document.addEventListener('did-navigate', handleDidNavigate);
    document.addEventListener('did-start-loading', handleDidStartLoading);
    document.addEventListener('did-stop-loading', handleDidStopLoading);
    document.addEventListener('did-fail-load', handleError);
    
    return () => {
      document.removeEventListener('did-navigate', handleDidNavigate);
      document.removeEventListener('did-start-loading', handleDidStartLoading);
      document.removeEventListener('did-stop-loading', handleDidStopLoading);
      document.removeEventListener('did-fail-load', handleError);
    };
  }, [currentTool]);
  
  // Add effect to load energy saver setting
  useEffect(() => {
    const savedEnergySaver = localStorage.getItem('energySaver');
    // If no setting exists, default to false
    setEnergySaver(savedEnergySaver === 'true');
  }, []);

  // Add effect to handle energy saver mode
  useEffect(() => {
    const webview = getCurrentWebviewRef();
    if (!webview) return;

    // Define CSS outside the injection function so it's accessible in cleanup
    const energySaverCSS = `
      video[autoplay] {
        ${energySaver ? 'display: none !important;' : ''}
      }
      
      .aifm-energy-saver-handled {
        display: none !important;
      }
      
      .aifm-play-button:hover {
        background: rgba(0, 0, 0, 0.8) !important;
      }
    `;

    // Function to inject energy saver scripts
    const injectEnergySaverScripts = () => {
      // Check if webview is ready
      if (!webview.getWebContentsId) {
        console.log('Webview not ready yet, waiting...');
        return;
      }

      console.log('Webview ready, injecting energy saver scripts');
      
      // Inject CSS and JavaScript to handle energy saver mode
      const energySaverScript = `
        (function() {
          // Function to handle video elements
          function handleVideos() {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
              if (${energySaver}) {
                // Remove autoplay attribute
                video.removeAttribute('autoplay');
                // Set preload to none to prevent loading
                video.setAttribute('preload', 'none');
                // Pause the video if it's playing
                if (!video.paused) {
                  video.pause();
                }
              } else {
                // Restore default behavior
                video.setAttribute('preload', 'auto');
              }
            });
          }

          // Function to handle animated images
          function handleAnimatedImages() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
              // Check if image is animated (GIF, WebP, or APNG)
              const isAnimated = img.src.match(/\\.(gif|webp|png)$/i) && 
                               !img.classList.contains('aifm-energy-saver-handled');
              
              if (isAnimated && ${energySaver}) {
                // Add our class to mark as handled
                img.classList.add('aifm-energy-saver-handled');
                
                // Store original src
                if (!img.dataset.originalSrc) {
                  img.dataset.originalSrc = img.src;
                }
                
                // Create a canvas to show first frame
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw the first frame
                ctx.drawImage(img, 0, 0);
                
                // Replace image with canvas
                img.style.display = 'none';
                img.parentNode.insertBefore(canvas, img);
                
                // Add play button overlay
                const playButton = document.createElement('div');
                playButton.className = 'aifm-play-button';
                playButton.innerHTML = '▶️';
                playButton.style.cssText = \`
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: rgba(0, 0, 0, 0.7);
                  color: white;
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  font-size: 20px;
                  z-index: 1000;
                \`;
                
                // Add container for positioning
                const container = document.createElement('div');
                container.style.cssText = \`
                  position: relative;
                  display: inline-block;
                \`;
                
                // Wrap canvas and play button
                container.appendChild(canvas);
                container.appendChild(playButton);
                
                // Replace original image with container
                img.parentNode.replaceChild(container, img);
                
                // Add click handler to resume animation
                playButton.addEventListener('click', () => {
                  // Restore original image
                  img.style.display = '';
                  container.replaceChild(img, canvas);
                  container.removeChild(playButton);
                  img.classList.remove('aifm-energy-saver-handled');
                });
              } else if (!${energySaver} && img.classList.contains('aifm-energy-saver-handled')) {
                // Restore original image when energy saver is disabled
                const container = img.parentNode;
                if (container.querySelector('.aifm-play-button')) {
                  container.removeChild(container.querySelector('.aifm-play-button'));
                }
                img.classList.remove('aifm-energy-saver-handled');
                img.style.display = '';
              }
            });
          }

          // Create a MutationObserver to watch for new elements
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.addedNodes.length) {
                handleVideos();
                handleAnimatedImages();
              }
            });
          });

          // Start observing the document with the configured parameters
          observer.observe(document.body, { childList: true, subtree: true });

          // Initial check for videos and animated images
          handleVideos();
          handleAnimatedImages();

          // Clean up observer when the script is removed
          return () => observer.disconnect();
        })();
      `;

      try {
        // Inject the script into the webview
        webview.executeJavaScript(energySaverScript);

        // Also inject CSS to prevent autoplay and style paused animations
        webview.insertCSS(energySaverCSS);
      } catch (error) {
        console.error('Error injecting energy saver scripts:', error);
      }
    };

    // Wait for dom-ready event before injecting scripts
    const handleDomReady = () => {
      console.log('Webview DOM ready, checking if webview is attached...');
      // Add a small delay to ensure webview is fully attached
      setTimeout(() => {
        if (webview.getWebContentsId) {
          console.log('Webview is attached and ready, injecting scripts');
          injectEnergySaverScripts();
        } else {
          console.log('Webview not fully attached yet, waiting...');
          // Try again after a short delay
          setTimeout(injectEnergySaverScripts, 100);
        }
      }, 100);
    };

    // Add dom-ready event listener
    webview.addEventListener('dom-ready', handleDomReady);

    // Clean up function
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      // Remove the CSS
      try {
        webview.removeInsertedCSS(energySaverCSS);
      } catch (error) {
        console.error('Error removing CSS:', error);
      }
    };
  }, [energySaver, currentTool]);
  
  // This ensures all webviews are created only once
  const renderAllWebviews = () => {
    return aiTools.map(tool => (
      <webview 
        key={tool.id}
        id={`webview-${tool.id}`}
        ref={el => { if (el) webviewRefs.current[tool.id] = el; }}
        src={tool.url}
        allowpopups="true"
        partition={`persist:${tool.id}`}
        style={{
          ...styles.webview,
          display: tool.id === currentTool?.id ? 'flex' : 'none',
          visibility: tool.id === currentTool?.id ? 'visible' : 'hidden',
          position: tool.id === currentTool?.id ? 'relative' : 'absolute',
          zIndex: tool.id === currentTool?.id ? 1 : -1
        }}
        webpreferences="allowRunningInsecureContent=no, contextIsolation=yes"
      />
    ));
  };
  
  const getCurrentWebviewRef = () => {
    return currentTool ? webviewRefs.current[currentTool.id] : null;
  };
  
  if (!currentTool) return (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingText}>Loading...</div>
    </div>
  );
  
  // Determine header style based on tool type
  const getHeaderStyle = () => {
    switch(toolType) {
      case 'llm': return {...styles.header, ...styles.headerBlue};
      case 'image': return {...styles.header, ...styles.headerGreen};
      case 'video': return {...styles.header, ...styles.headerRed};
      case 'audio': return {...styles.header, ...styles.headerAmber};
      case 'other': return {...styles.header, ...styles.headerPurple};
      default: return styles.header;
    }
  };
  
  // Get loading indicator color
  const getLoadingColor = () => {
    switch(toolType) {
      case 'llm': return '#2563eb';
      case 'image': return '#059669';
      case 'video': return '#dc2626';
      case 'audio': return '#d97706';
      case 'other': return '#7c3aed';
      default: return '#6b7280';
    }
  };
  
  // Get tool icon - either favicon or fallback
  const getToolIcon = () => {
    if (favicon) {
      return (
        <img 
          src={favicon} 
          alt={currentTool?.name || 'Tool'} 
          style={{width: '1.25rem', height: '1.25rem'}}
          crossOrigin="anonymous"
          onError={(e) => {
            console.log('Favicon failed to load, trying alternative locations or using fallback');
            
            // Extract the current URL to determine which alternative to try next
            const currentSrc = e.target.src;
            
            try {
              const urlObj = new URL(currentTool.url);
              
              // Try alternative favicon locations in sequence
              if (currentSrc.endsWith('/favicon.ico')) {
                e.target.src = `${urlObj.protocol}//${urlObj.hostname}/favicon.png`;
              } else if (currentSrc.endsWith('/favicon.png')) {
                e.target.src = `${urlObj.protocol}//${urlObj.hostname}/apple-touch-icon.png`;
              } else if (currentSrc.endsWith('/apple-touch-icon.png')) {
                e.target.src = `${urlObj.protocol}//${urlObj.hostname}/apple-touch-icon-precomposed.png`;
              } else if (currentSrc.endsWith('/apple-touch-icon-precomposed.png')) {
                // Try to use Google's favicon service directly
                const hostname = urlObj.hostname;
                e.target.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
              } else if (currentSrc.includes('google.com/s2/favicons')) {
                // If Google's service also fails, fall back to default
                setFavicon(null);
              } else {
                // If we're here with an unknown path, try Google's service
                const hostname = urlObj.hostname;
                e.target.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
              }
            } catch (error) {
              console.error('Error setting alternative favicon:', error);
              setFavicon(null);
            }
          }}
        />
      );
    }
    
    // Fallback to type-based icons
    switch(toolType) {
      case 'llm':
        return (
          <img src={textIcon} alt="Text" style={{width: '1.25rem', height: '1.25rem'}} />
        );
      case 'image':
        return (
          <img src={imageIcon} alt="Image" style={{width: '1.25rem', height: '1.25rem'}} />
        );
      case 'video':
        return (
          <img src={videoIcon} alt="Video" style={{width: '1.25rem', height: '1.25rem'}} />
        );
      case 'audio':
        return (
          <img src={audioIcon} alt="Audio" style={{width: '1.25rem', height: '1.25rem'}} />
        );
      case 'other':
        return (
          <img src={otherIcon} alt="Other" style={{width: '1.25rem', height: '1.25rem'}} />
        );
      default:
        return null;
    }
  };
  
  // Update drop handlers to be more reliable
  const handleDragOver = (e) => {
    e.preventDefault();
    
    // Check for valid image data in all supported formats
    const hasImageData = e.dataTransfer.types.some(type => 
      type === 'application/json' || 
      type === 'application/aifm-image' || 
      type === 'text/plain' || 
      type.startsWith('image/')
    );
    
    if (hasImageData) {
      setIsDragOver(true);
      
      // Change the cursor to indicate a valid drop target
      e.dataTransfer.dropEffect = 'copy';
      
      // Log when we're in drag-over state for debugging
      console.log('Drag over with image data detected');
    }
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      console.log('Drop event received with types:', e.dataTransfer.types);
      
      // Get the current webview reference
      const webview = getCurrentWebviewRef();
      if (!webview) {
        console.error('No webview reference found');
        setError('Could not access the tool window. Please try refreshing the page.');
        return;
      }
      
      // Check if we have actual files in the drop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        
        if (file.type.startsWith('image/')) {
          console.log('Got actual image file:', file.name, file.type);
          
          // Read file as dataURL to pass to webview
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            transferImageToWebview(webview, {
              name: file.name,
              url: dataUrl,
              type: file.type,
              isRealFile: true
            });
          };
          reader.readAsDataURL(file);
          return;
        }
      }
      
      // Check for our custom format
      let imageData;
      let imageJson = e.dataTransfer.getData('application/aifm-image');
      
      if (!imageJson) {
        imageJson = e.dataTransfer.getData('application/json');
      }
      
      if (imageJson) {
        try {
          const parsedData = JSON.parse(imageJson);
          if (parsedData.url || parsedData.source === 'mediaLibrary') {
            imageData = parsedData;
            
            // If we have an image from our media library but no direct URL
            if (parsedData.source === 'mediaLibrary' && !parsedData.url) {
              // Get URL from sessionStorage
              const storedImage = window.sessionStorage.getItem('aifm-last-dragged-image');
              if (storedImage) {
                imageData.url = storedImage;
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse JSON image data:', e);
        }
      }
      
      // If no JSON data, check for image URL in plain text or URI list
      if (!imageData) {
        const textData = e.dataTransfer.getData('text/plain');
        const uriListData = e.dataTransfer.getData('text/uri-list');
        
        // Use URI list first if it exists and looks like an image URL
        if (uriListData && (
          uriListData.startsWith('data:image/') ||
          uriListData.match(/\.(jpeg|jpg|gif|png|webp)$/i)
        )) {
          imageData = { url: uriListData, name: 'image.png' };
        } 
        // Otherwise check plain text
        else if (textData && (
          textData.startsWith('data:image/') ||
          textData.match(/\.(jpeg|jpg|gif|png|webp)$/i)
        )) {
          imageData = { url: textData, name: 'image.png' };
        }
      }
      
      // If we found image data, transfer it to the webview
      if (imageData && imageData.url) {
        console.log('Found image data to transfer');
        transferImageToWebview(webview, imageData);
      } else {
        console.log('No usable image data found in drop');
        setError('No usable image found in the dropped content.');
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      setError(`Error processing image: ${error.message}`);
    }
  };
  
  const transferImageToWebview = (webview, imageData) => {
    console.log('Transferring image to webview:', imageData.name);
    
    // Save to sessionStorage for the webview preload script to access
    try {
      window.sessionStorage.setItem('aifm-last-dragged-image', imageData.url);
      window.sessionStorage.setItem('aifm-last-dragged-image-name', imageData.name || 'image.png');
      window.sessionStorage.setItem('aifm-last-dragged-image-type', imageData.type || 'image/png');
      window.sessionStorage.setItem('aifm-last-dragged-timestamp', Date.now().toString());
    } catch (err) {
      console.warn('Could not save to sessionStorage:', err);
    }
    
    // First, initialize the webview with our special helper script to access clipboard
    webview.executeJavaScript(`
      (function() {
        try {
          // Create or update the clipboard helper function
          window.writeImageToClipboard = async function(dataUrl) {
            try {
              // Fetch the image and convert to a blob
              const fetchResult = await fetch(dataUrl);
              const blob = await fetchResult.blob();
              
              // Create a ClipboardItem with the blob
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
          
          return true;
        } catch (error) {
          console.error('Error setting up clipboard helper:', error);
          return false;
        }
      })();
    `)
    .then(clipboardHelperReady => {
      // Now execute tool-specific drop handling
      if (clipboardHelperReady) {
        console.log('Clipboard helper successfully initialized');
      }
      
      // Try to actually write the image to the clipboard in the webview
      webview.executeJavaScript(`
        (function() {
          try {
            const imageUrl = '${imageData.url}';
            
            // Set up clipboard data if API is available
            if (window.writeImageToClipboard) {
              window.writeImageToClipboard(imageUrl)
                .then(success => {
                  if (success) {
                    console.log('Image ready in clipboard!');
                    
                    // Show notification about clipboard
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
                    
                    notification.innerHTML = '<div style="font-weight: bold; margin-bottom: 10px;">Image Copied to Clipboard!</div>';
                    notification.innerHTML += '<div>You can now paste the image using Ctrl+V or Command+V</div>';
                    
                    document.body.appendChild(notification);
                    
                    // Remove after 4 seconds
                    setTimeout(() => {
                      if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                      }
                    }, 4000);
                  }
                });
            }
            
            // Store the image data for our helper script
            sessionStorage.setItem('aifm-last-dragged-image', imageUrl);
            sessionStorage.setItem('aifm-last-dragged-image-name', '${imageData.name || "image.png"}');
            sessionStorage.setItem('aifm-last-dragged-image-type', '${imageData.type || "image/png"}');
            
            return true;
          } catch (error) {
            console.error('Error processing image in webview:', error);
            return false;
          }
        })();
      `)
      .then(result => {
        if (result) {
          console.log('Image data successfully transferred to webview');
        } else {
          console.error('Failed to transfer image data to webview');
        }
        
        // Now handle tool-specific behaviors
        if (toolType === 'image') {
          handleImageToolDrop(webview, imageData);
        } else if (toolType === 'llm') {
          handleLLMToolDrop(webview, imageData);
        } else if (toolType === 'video') {
          handleVideoToolDrop(webview, imageData);
        } else {
          handleGenericToolDrop(webview, imageData);
        }
        
        // Show success notification
        const successNotification = document.createElement('div');
        successNotification.style.position = 'fixed';
        successNotification.style.bottom = '20px';
        successNotification.style.left = '50%';
        successNotification.style.transform = 'translateX(-50%)';
        successNotification.style.backgroundColor = '#059669';
        successNotification.style.color = 'white';
        successNotification.style.padding = '10px 20px';
        successNotification.style.borderRadius = '5px';
        successNotification.style.zIndex = '9999';
        successNotification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        successNotification.textContent = `Image transferred to ${currentTool?.name}`;
        document.body.appendChild(successNotification);
        setTimeout(() => document.body.removeChild(successNotification), 3000);
      })
      .catch(error => {
        console.error('Error executing JavaScript in webview:', error);
        setError(`Error transferring image: ${error.message}`);
      });
    })
    .catch(error => {
      console.error('Error setting up clipboard helper:', error);
      setError(`Error setting up clipboard helper: ${error.message}`);
    });
  };
  
  // Specific handlers for different tool types
  const handleImageToolDrop = (webview, image) => {
    // For Midjourney, find the input field and paste the image
    if (currentTool.id.includes('journey')) {
      // Midjourney specific handling
      webview.executeJavaScript(`
        (function() {
          // Try to find the upload button and click it
          const uploadButtons = document.querySelectorAll('button');
          const uploadButton = Array.from(uploadButtons).find(btn => 
            btn.textContent.toLowerCase().includes('upload') || 
            btn.innerHTML.includes('upload'));
          
          if (uploadButton) {
            uploadButton.click();
            console.log('Upload button clicked');
          }
        })();
      `);
    } else if (currentTool.id.includes('ideogram')) {
      // Ideogram specific handling
      webview.executeJavaScript(`
        (function() {
          // Try to find the image upload area
          const uploadAreas = document.querySelectorAll('input[type="file"]');
          if (uploadAreas.length > 0) {
            console.log('Found upload area');
            // We can't directly set the file, but we can focus it to prompt user
            uploadAreas[0].focus();
          }
        })();
      `);
    } else {
      // Generic approach for other image tools
      handleGenericToolDrop(webview, image);
    }
  };
  
  const handleLLMToolDrop = (webview, image) => {
    console.log('Handling drop for LLM tool:', currentTool.id);
    
    // Extra handling for ChatGPT
    if (currentTool.id.includes('chat')) {
      webview.executeJavaScript(`
        (function() {
          // Specifically look for ChatGPT's file upload button first
          const chatGPTFileButton = document.querySelector('button[aria-label="Attach files"]');
          
          if (chatGPTFileButton) {
            console.log('Found ChatGPT paperclip button');
            
            // Make it extremely obvious
            chatGPTFileButton.style.outline = '3px solid #4f46e5';
            chatGPTFileButton.style.boxShadow = '0 0 0 5px rgba(79, 70, 229, 0.4)';
            chatGPTFileButton.style.animation = 'aifmPulse 1.5s infinite';
            
            // Create a large arrow pointing to the button
            const buttonRect = chatGPTFileButton.getBoundingClientRect();
            const arrow = document.createElement('div');
            arrow.innerHTML = '⬇️';
            arrow.style.position = 'absolute';
            arrow.style.left = (buttonRect.left + buttonRect.width/2 - 15) + 'px';
            arrow.style.top = (buttonRect.top - 30) + 'px';
            arrow.style.fontSize = '30px';
            arrow.style.fontWeight = 'bold';
            arrow.style.color = '#4f46e5';
            arrow.style.zIndex = '10000';
            document.body.appendChild(arrow);
            
            // Add text hint
            const hint = document.createElement('div');
            hint.textContent = 'CLICK HERE!';
            hint.style.position = 'absolute';
            hint.style.left = (buttonRect.left + buttonRect.width/2 - 50) + 'px';
            hint.style.top = (buttonRect.top - 60) + 'px';
            hint.style.fontSize = '16px';
            hint.style.fontWeight = 'bold';
            hint.style.padding = '5px 10px';
            hint.style.backgroundColor = '#4f46e5';
            hint.style.color = 'white';
            hint.style.borderRadius = '5px';
            hint.style.zIndex = '10000';
            document.body.appendChild(hint);
            
            // Auto-click it after 1 second
            setTimeout(() => {
              try {
                chatGPTFileButton.click();
                console.log('Auto-clicked ChatGPT paperclip button');
              } catch (e) {
                console.error('Failed to auto-click paperclip button:', e);
              }
            }, 1000);
            
            // Remove visual elements after 5 seconds
            setTimeout(() => {
              chatGPTFileButton.style.outline = '';
              chatGPTFileButton.style.boxShadow = '';
              chatGPTFileButton.style.animation = '';
              if (document.body.contains(arrow)) document.body.removeChild(arrow);
              if (document.body.contains(hint)) document.body.removeChild(hint);
            }, 5000);
            
            return true;
          }
          
          return false;
        })();
      `)
      .then(result => {
        if (!result) {
          // Fall back to the generic LLM handler
          console.log('ChatGPT paperclip button not found, using generic approach');
          handleGenericLLMToolDrop(webview, image);
        }
      })
      .catch(err => {
        console.error('Error with ChatGPT specific handler:', err);
        handleGenericLLMToolDrop(webview, image);
      });
    } 
    // Extra handling for Claude
    else if (currentTool.id.includes('claude')) {
      webview.executeJavaScript(`
        (function() {
          // Find Claude's paperclip button
          const uploadButtons = document.querySelectorAll('button');
          const claudeButton = Array.from(uploadButtons).find(btn => {
            // Look for SVG icons that might be paperclips
            const svg = btn.querySelector('svg');
            if (svg) {
              return svg.innerHTML.includes('path') && 
                (btn.getAttribute('aria-label')?.toLowerCase().includes('file') ||
                 btn.getAttribute('aria-label')?.toLowerCase().includes('attach') ||
                 btn.getAttribute('aria-label')?.toLowerCase().includes('upload'));
            }
            return false;
          });
          
          if (claudeButton) {
            console.log('Found Claude upload button');
            
            // Make it extremely obvious
            claudeButton.style.outline = '3px solid #4f46e5';
            claudeButton.style.boxShadow = '0 0 0 5px rgba(79, 70, 229, 0.4)';
            claudeButton.style.animation = 'aifmPulse 1.5s infinite';
            
            // Create a large arrow pointing to the button
            const buttonRect = claudeButton.getBoundingClientRect();
            const arrow = document.createElement('div');
            arrow.innerHTML = '⬇️';
            arrow.style.position = 'absolute';
            arrow.style.left = (buttonRect.left + buttonRect.width/2 - 15) + 'px';
            arrow.style.top = (buttonRect.top - 30) + 'px';
            arrow.style.fontSize = '30px';
            arrow.style.fontWeight = 'bold';
            arrow.style.color = '#4f46e5';
            arrow.style.zIndex = '10000';
            document.body.appendChild(arrow);
            
            // Add text hint
            const hint = document.createElement('div');
            hint.textContent = 'CLICK HERE!';
            hint.style.position = 'absolute';
            hint.style.left = (buttonRect.left + buttonRect.width/2 - 50) + 'px';
            hint.style.top = (buttonRect.top - 60) + 'px';
            hint.style.fontSize = '16px';
            hint.style.fontWeight = 'bold';
            hint.style.padding = '5px 10px';
            hint.style.backgroundColor = '#4f46e5';
            hint.style.color = 'white';
            hint.style.borderRadius = '5px';
            hint.style.zIndex = '10000';
            document.body.appendChild(hint);
            
            // Auto-click it after 1 second
            setTimeout(() => {
              try {
                claudeButton.click();
                console.log('Auto-clicked Claude upload button');
              } catch (e) {
                console.error('Failed to auto-click upload button:', e);
              }
            }, 1000);
            
            // Remove visual elements after 5 seconds
            setTimeout(() => {
              claudeButton.style.outline = '';
              claudeButton.style.boxShadow = '';
              claudeButton.style.animation = '';
              if (document.body.contains(arrow)) document.body.removeChild(arrow);
              if (document.body.contains(hint)) document.body.removeChild(hint);
            }, 5000);
            
            return true;
          }
          
          return false;
        })();
      `)
      .then(result => {
        if (!result) {
          // Fall back to the generic LLM handler
          console.log('Claude upload button not found, using generic approach');
          handleGenericLLMToolDrop(webview, image);
        }
      })
      .catch(err => {
        console.error('Error with Claude specific handler:', err);
        handleGenericLLMToolDrop(webview, image);
      });
    }
    else {
      // Generic approach for other LLM tools
      handleGenericLLMToolDrop(webview, image);
    }
  };
  
  // Generic LLM drop handler when specific detection fails
  const handleGenericLLMToolDrop = (webview, image) => {
    // For ChatGPT or similar LLMs
    webview.executeJavaScript(`
      (function() {
        // First, try to find file upload buttons or inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        const uploadButtons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent.toLowerCase().includes('upload') || 
          b.getAttribute('aria-label')?.toLowerCase().includes('upload') ||
          b.title?.toLowerCase().includes('upload')
        );
        
        console.log('Found file inputs:', fileInputs.length);
        console.log('Found upload buttons:', uploadButtons.length);
        
        // If we found upload buttons, try to click the first one
        if (uploadButtons.length > 0) {
          try {
            uploadButtons[0].click();
            console.log('Clicked upload button');
            return true;
          } catch (err) {
            console.error('Error clicking upload button:', err);
          }
        }
        
        // If we found file inputs, highlight them
        if (fileInputs.length > 0) {
          // Create image drop helper
          const helper = document.createElement('div');
          helper.style.position = 'fixed';
          helper.style.top = '20%';
          helper.style.left = '50%';
          helper.style.transform = 'translateX(-50%)';
          helper.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          helper.style.color = 'white';
          helper.style.padding = '15px 25px';
          helper.style.borderRadius = '8px';
          helper.style.zIndex = '10000';
          helper.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          helper.style.maxWidth = '80%';
          helper.style.textAlign = 'center';
          
          // Create helper text
          helper.innerHTML = '<div style="font-weight: bold; margin-bottom: 10px;">Image Ready to Use</div>';
          helper.innerHTML += '<div style="margin-bottom: 15px;">Look for an upload button or paperclip icon in the interface</div>';
          
          document.body.appendChild(helper);
          
          // Remove after 8 seconds
          setTimeout(() => {
            if (document.body.contains(helper)) {
              document.body.removeChild(helper);
            }
          }, 8000);
          
          // Highlight upload elements
          fileInputs.forEach(input => {
            // Save original styles
            const originalOutline = input.style.outline;
            const originalBoxShadow = input.style.boxShadow;
            
            // Apply highlighting with pulse animation
            input.style.outline = '2px solid #4f46e5';
            input.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.4)';
            
            // Add pulsing animation
            input.style.animation = 'pulse 2s infinite';
            
            // Create a hint tooltip near the element
            const rect = input.getBoundingClientRect();
            const hint = document.createElement('div');
            hint.textContent = 'Try here!';
            hint.style.position = 'absolute';
            hint.style.left = rect.right + 'px';
            hint.style.top = rect.top + 'px';
            hint.style.backgroundColor = '#4f46e5';
            hint.style.color = 'white';
            hint.style.padding = '4px 8px';
            hint.style.borderRadius = '4px';
            hint.style.fontSize = '12px';
            hint.style.zIndex = '10000';
            hint.style.pointerEvents = 'none';
            document.body.appendChild(hint);
            
            // Restore original styles after 5 seconds
            setTimeout(() => {
              input.style.outline = originalOutline;
              input.style.boxShadow = originalBoxShadow;
              input.style.animation = '';
              if (document.body.contains(hint)) {
                document.body.removeChild(hint);
              }
            }, 5000);
          });
          
          return true;
        }
        
        // If all else fails, try to find the textarea and add a note about the image
        const textareas = document.querySelectorAll('textarea');
        const contentEditables = document.querySelectorAll('[contenteditable="true"]');
        
        // Try ChatGPT textarea first
        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value += '\n\nI have an image I want to discuss. How can I upload it to this conversation?';
          
          // Create and dispatch input event
          const event = new Event('input', { bubbles: true });
          textarea.dispatchEvent(event);
          
          // Focus the textarea
          textarea.focus();
          return true;
        }
        
        // Try contenteditable divs (Claude uses these)
        if (contentEditables.length > 0) {
          const editor = contentEditables[0];
          editor.innerHTML += '<p>I have an image I want to discuss. How can I upload it to this conversation?</p>';
          
          // Create and dispatch input event
          const event = new Event('input', { bubbles: true });
          editor.dispatchEvent(event);
          
          // Focus the editor
          editor.focus();
          return true;
        }
        
        return false;
      })();
    `)
    .then(result => {
      if (!result) {
        console.log('No suitable elements found for LLM tool, using generic approach');
        handleGenericToolDrop(webview, image);
      }
    })
    .catch(err => {
      console.error('Error in LLM tool drop handler:', err);
      handleGenericToolDrop(webview, image);
    });
  };
  
  const handleVideoToolDrop = (webview, image) => {
    // Video tool specific handling
    if (currentTool.id.includes('runway') || currentTool.id.includes('pika')) {
      webview.executeJavaScript(`
        (function() {
          // Find upload buttons or areas
          const uploadButtons = document.querySelectorAll('button');
          const uploadButton = Array.from(uploadButtons).find(btn => 
            btn.textContent.toLowerCase().includes('upload') || 
            btn.innerHTML.includes('upload'));
          
          if (uploadButton) {
            uploadButton.click();
            console.log('Upload button clicked');
          }
        })();
      `);
    } else {
      // Generic approach for other video tools
      handleGenericToolDrop(webview, image);
    }
  };
  
  const handleGenericToolDrop = (webview, image) => {
    // More reliable approach for Electron webviews
    
    // First notify user about the image
    webview.executeJavaScript(`
      (function() {
        // Create a notification
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
        notification.style.fontSize = '14px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        notification.textContent = 'Image ready to use. Look for an upload button or drop zone.';
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 5000);
        
        // Look for common upload elements
        const uploadSelectors = [
          'input[type="file"]',
          '[role="button"]:not([disabled])',
          'button:not([disabled])',
          '.uploader',
          '.upload',
          '.dropzone',
          '[aria-label*="upload" i]',
          '[title*="upload" i]',
          '[placeholder*="upload" i]'
        ];
        
        // Try to find and highlight upload elements
        uploadSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.offsetParent !== null) {  // Check if element is visible
              // Save original styles
              const originalOutline = el.style.outline;
              const originalBoxShadow = el.style.boxShadow;
              
              // Apply highlighting
              el.style.outline = '2px solid #4f46e5';
              el.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.4)';
              
              // Add pulsing animation
              el.style.animation = 'pulse 2s infinite';
              
              // Create a hint tooltip near the element
              const rect = el.getBoundingClientRect();
              const hint = document.createElement('div');
              hint.textContent = 'Try here!';
              hint.style.position = 'absolute';
              hint.style.left = rect.right + 'px';
              hint.style.top = rect.top + 'px';
              hint.style.backgroundColor = '#4f46e5';
              hint.style.color = 'white';
              hint.style.padding = '4px 8px';
              hint.style.borderRadius = '4px';
              hint.style.fontSize = '12px';
              hint.style.zIndex = '10000';
              hint.style.pointerEvents = 'none';
              document.body.appendChild(hint);
              
              // Restore original styles after 5 seconds
              setTimeout(() => {
                el.style.outline = originalOutline;
                el.style.boxShadow = originalBoxShadow;
                el.style.animation = '';
                if (document.body.contains(hint)) {
                  document.body.removeChild(hint);
                }
              }, 5000);
            }
          });
        });
      })();
    `);
    
    // Also create a temporary global variable with the image data that tools can access
    const imageDataForTools = {
      name: image.name,
      url: image.url,
      timestamp: Date.now()
    };
    
    webview.executeJavaScript(`
      window._tempDroppedImage = ${JSON.stringify(imageDataForTools)};
      console.log('Image data available as window._tempDroppedImage');
    `);
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={getHeaderStyle()}>
        <div style={styles.headerContent}>
          <button 
            onClick={() => getCurrentWebviewRef()?.goBack()} 
            style={{...styles.button, ...(hoverState.back ? styles.buttonHover : {})}}
            onMouseEnter={() => setHoverState(prev => ({...prev, back: true}))}
            onMouseLeave={() => setHoverState(prev => ({...prev, back: false}))}
          >
            <svg style={{width: '1.25rem', height: '1.25rem'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => getCurrentWebviewRef()?.goForward()} 
            style={{...styles.button, ...(hoverState.forward ? styles.buttonHover : {})}}
            onMouseEnter={() => setHoverState(prev => ({...prev, forward: true}))}
            onMouseLeave={() => setHoverState(prev => ({...prev, forward: false}))}
          >
            <svg style={{width: '1.25rem', height: '1.25rem'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button 
            onClick={() => {
              setError(null);
              getCurrentWebviewRef()?.reload();
            }} 
            style={{...styles.button, marginRight: '1rem', ...(hoverState.reload ? styles.buttonHover : {})}}
            onMouseEnter={() => setHoverState(prev => ({...prev, reload: true}))}
            onMouseLeave={() => setHoverState(prev => ({...prev, reload: false}))}
          >
            <svg style={{width: '1.25rem', height: '1.25rem'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div style={styles.urlBar}>
            {url}
          </div>
          <div style={styles.toolInfo}>
            <div style={styles.toolIcon}>
              {getToolIcon()}
            </div>
            <span style={{fontWeight: 500}}>{currentTool?.name}</span>
          </div>
        </div>
      </div>
      
      {/* Loading Indicator */}
      {isLoading && (
        <div style={styles.loadingBar}>
          <div 
            style={{
              ...styles.loadingIndicator, 
              backgroundColor: getLoadingColor()
            }} 
          />
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          <strong style={{fontWeight: 'bold'}}>Error: </strong>
          <span>{error}</span>
          <button 
            onClick={() => {
              setError(null);
              if (getCurrentWebviewRef()) {
                getCurrentWebviewRef().loadURL(currentTool.url);
              }
            }} 
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <svg width="1.5rem" height="1.5rem" fill="#b91c1c" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}
      
      {/* Webview Container */}
      <div
        style={{
          ...styles.webviewContainer,
          ...(isDragOver ? dropStyles.activeDrop : {})
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div style={dropStyles.dropZone}>
            <div style={dropStyles.dropMessage}>
              Drop image here
              <div style={dropStyles.dropSubtext}>
                Image will be uploaded to {currentTool?.name}
              </div>
            </div>
          </div>
        )}
        {renderAllWebviews()}
      </div>
    </div>
  );
};

export default WebViewPage; 