import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  const [toolType, setToolType] = useState('llm');
  
  // Load categorized tools from localStorage
  const [categorizedTools, setCategorizedTools] = useState(() => {
    const saved = localStorage.getItem('categorizedTools');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Default tools if nothing in localStorage
    return {
      llm: [
        { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/' },
        { id: 'claude', name: 'Claude', url: 'https://claude.ai/' },
        { id: 'perplexity', name: 'Perplexity', url: 'https://perplexity.ai/' },
      ],
      image: [
        { id: 'midjourney', name: 'Midjourney', url: 'https://www.midjourney.com/' },
        { id: 'ideogram', name: 'Ideogram', url: 'https://ideogram.ai/' },
        { id: 'recraft', name: 'Recraft', url: 'https://www.recraft.ai/' },
      ],
      video: [
        { id: 'hailuo', name: 'Hailuo AI', url: 'https://hailuoai.video/' },
        { id: 'runway', name: 'RunwayML', url: 'https://runwayml.com/' },
        { id: 'pika', name: 'Pika Labs', url: 'https://pika.art/' },
        { id: 'kling', name: 'Kling AI', url: 'https://kling.ai/' },
      ],
      audio: [
        { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/' },
        { id: 'suno', name: 'Suno', url: 'https://suno.ai/' },
      ],
      other: [
        { id: 'heygen', name: 'HeyGen', url: 'https://www.heygen.com/' },
        { id: 'descript', name: 'Descript', url: 'https://www.descript.com/' },
      ]
    };
  });
  
  // Password management state
  const [savedCredentials, setSavedCredentials] = useState(() => {
    const saved = localStorage.getItem('savedCredentials');
    return saved ? JSON.parse(saved) : [];
  });
  const [newCredential, setNewCredential] = useState({
    service: '',
    username: '',
    password: '',
  });

  // Keybinding state
  const [keybindings, setKeybindings] = useState(() => {
    const saved = localStorage.getItem('keybindings');
    return saved ? JSON.parse(saved) : {
      // Global shortcuts - start with empty values
      openNotes: '',
      toggleMediaLibrary: '',
      openAssistant: '',
      toggleRecentTools: '',
      toggleDebug: '',
      
      // LLM tools
      chatgpt: '',
      claude: '',
      perplexity: '',
      
      // Image tools
      midjourney: '',
      ideogram: '',
      recraft: '',
      
      // Video tools
      hailuo: '',
      runway: '',
      pika: '',
      kling: '',
      
      // Audio tools
      elevenlabs: '',
      suno: '',
      
      // Other tools
      heygen: '',
      descript: '',
    };
  });
  const [editingKeybinding, setEditingKeybinding] = useState(null);
  const [newKey, setNewKey] = useState('');
  
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageContent, setSuccessMessageContent] = useState('');

  const [mediaLibraryPath, setMediaLibraryPath] = useState(() => {
    return localStorage.getItem('mediaLibraryPath') || '';
  });

  // Add cookie management state
  const [cookies, setCookies] = useState([]);
  const [cookieDomains, setCookieDomains] = useState([]);
  const [loadingCookies, setLoadingCookies] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domainCookies, setDomainCookies] = useState([]);

  // Add this function near the top of the component before useEffect hooks
  const isElectron = () => {
    // Check if running in Electron by looking for these specific properties
    if (
      typeof window !== 'undefined' && 
      typeof window.electron !== 'undefined'
    ) {
      console.log('Detected Electron environment via window.electron');
      return true;
    }
    
    if (
      typeof window !== 'undefined' && 
      typeof window.process !== 'undefined' && 
      typeof window.process.versions !== 'undefined' && 
      typeof window.process.versions.electron !== 'undefined'
    ) {
      console.log('Detected Electron environment via process.versions.electron');
      return true;
    }
    
    console.log('Not running in Electron environment, cookie management hidden');
    return false;
  };

  // Load saved API keys on component mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      if (keys[aiProvider]) {
        setApiKey(keys[aiProvider]);
      }
    }
  }, [aiProvider]);

  // Handle keybinding changes
  useEffect(() => {
    localStorage.setItem('keybindings', JSON.stringify(keybindings));
  }, [keybindings]);

  // Save credentials to localStorage
  useEffect(() => {
    localStorage.setItem('savedCredentials', JSON.stringify(savedCredentials));
  }, [savedCredentials]);
  
  const handleSaveAPIKey = (e) => {
    e.preventDefault();
    
    // Save API key to localStorage
    const savedKeys = localStorage.getItem('apiKeys');
    const keys = savedKeys ? JSON.parse(savedKeys) : {};
    keys[aiProvider] = apiKey;
    localStorage.setItem('apiKeys', JSON.stringify(keys));
    
    // Show success message
    showMessage(`${aiProvider} API key saved successfully!`);
  };
  
  const handleAddSite = (e) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteUrl.trim()) return;
    
    const newId = newSiteName.toLowerCase().replace(/\s+/g, '-');
    
    const updatedTools = {
      ...categorizedTools,
      [toolType]: [
        ...categorizedTools[toolType],
        { id: newId, name: newSiteName, url: newSiteUrl }
      ]
    };
    
    // Update the state
    setCategorizedTools(updatedTools);
    
    // Save to localStorage and trigger an event for other components
    localStorage.setItem('categorizedTools', JSON.stringify(updatedTools));
    
    // Dispatch a custom event to notify App.jsx directly (in case it's in the same window)
    window.dispatchEvent(new CustomEvent('toolsChanged', { 
      detail: updatedTools 
    }));
    
    // Show success message
    showMessage(`${newSiteName} added to ${getCategoryTitle(toolType)}!`);
    
    setNewSiteName('');
    setNewSiteUrl('');
  };
  
  const handleRemoveSite = (id, category) => {
    const updatedTools = {
      ...categorizedTools,
      [category]: categorizedTools[category].filter(site => site.id !== id)
    };
    
    // Update the state
    setCategorizedTools(updatedTools);
    
    // Save to localStorage and trigger an event for other components
    localStorage.setItem('categorizedTools', JSON.stringify(updatedTools));
    
    // Dispatch a custom event to notify App.jsx directly (in case it's in the same window)
    window.dispatchEvent(new CustomEvent('toolsChanged', { 
      detail: updatedTools 
    }));
    
    // Show success message
    showMessage('Tool removed successfully!');
  };

  // Keybinding handlers
  const startEditingKeybinding = (key) => {
    setEditingKeybinding(key);
    setNewKey('');
  };

  const handleKeybindingChange = (e) => {
    if (!editingKeybinding) return;
    
    // Only save when a key is pressed
    if (e.key === 'Escape') {
      setEditingKeybinding(null);
      return;
    }
    
    // Skip if we only pressed a modifier key
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }
    
    // Create a combo string with any combination of modifiers
    const modifiers = [];
    if (e.metaKey) modifiers.push('Cmd');
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    
    // Only proceed if at least one modifier is pressed
    if (modifiers.length === 0) {
      return;
    }
    
    // Determine the key display name (for special keys like Enter, Space, etc.)
    let keyName = e.key.toUpperCase();
    
    // Handle special keys
    if (e.key === ' ') keyName = 'SPACE';
    else if (e.key === 'ArrowUp') keyName = 'UP';
    else if (e.key === 'ArrowDown') keyName = 'DOWN';
    else if (e.key === 'ArrowLeft') keyName = 'LEFT';
    else if (e.key === 'ArrowRight') keyName = 'RIGHT';
    else if (e.key.length > 1) keyName = e.key.toUpperCase(); // Other special keys
    
    const combo = [...modifiers, keyName].join('+');
    setNewKey(combo);
    
    // Log the key event for debugging
    console.log('Key event:', e.key, e.code, combo);
  };

  const saveKeybinding = () => {
    if (!editingKeybinding || !newKey) return;
    
    console.log(`Saving keybinding for ${editingKeybinding}: ${newKey}`);
    
    // Global shortcuts use camelCase, tools use lowercase
    // Determine if this is a global shortcut by checking if it exists in the initial state
    const isGlobalShortcut = [
      'openNotes', 
      'toggleMediaLibrary', 
      'openAssistant', 
      'toggleRecentTools', 
      'toggleDebug'
    ].includes(editingKeybinding);
    
    // Only convert to lowercase for tool IDs, not for global shortcuts
    const bindingKey = isGlobalShortcut ? editingKeybinding : editingKeybinding.toLowerCase();
    
    // Update keybindings state
    setKeybindings(prev => {
      const updatedBindings = {
        ...prev,
        [bindingKey]: newKey
      };
      
      console.log('Updated keybindings:', updatedBindings);
      
      // Save to localStorage
      localStorage.setItem('keybindings', JSON.stringify(updatedBindings));
      
      // Dispatch a custom event to notify other components (especially App.jsx)
      window.dispatchEvent(new CustomEvent('keybindingsChanged', { 
        detail: updatedBindings 
      }));
      
      return updatedBindings;
    });
    
    setEditingKeybinding(null);
    setNewKey('');
    
    showMessage('Keybinding updated!');
  };

  // Credential management handlers
  const handleCredentialChange = (field, value) => {
    setNewCredential(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCredential = (e) => {
    e.preventDefault();
    if (!newCredential.service || !newCredential.username) return;
    
    setSavedCredentials(prev => [...prev, { 
      id: Date.now(), 
      ...newCredential 
    }]);
    
    setNewCredential({
      service: '',
      username: '',
      password: '',
    });
    
    showMessage('Credentials saved successfully!');
  };

  const handleRemoveCredential = (id) => {
    setSavedCredentials(prev => prev.filter(cred => cred.id !== id));
  };
  
  // Helper function to get color based on category
  const getCategoryColor = (category) => {
    switch(category) {
      case 'llm': return 'border-blue-600 bg-blue-50';
      case 'image': return 'border-green-600 bg-green-50';
      case 'video': return 'border-red-600 bg-red-50';
      case 'audio': return 'border-amber-600 bg-amber-50';
      case 'other': return 'border-purple-600 bg-purple-50';
      default: return 'border-gray-600 bg-gray-50';
    }
  };
  
  const getCategoryTextColor = (category) => {
    switch(category) {
      case 'llm': return 'text-blue-600';
      case 'image': return 'text-green-600';
      case 'video': return 'text-red-600';
      case 'audio': return 'text-amber-600';
      case 'other': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };
  
  const getCategoryTitle = (category) => {
    switch(category) {
      case 'llm': return 'Language Models';
      case 'image': return 'Image Generation';
      case 'video': return 'Video Creation';
      case 'audio': return 'Audio Generation';
      case 'other': return 'Other Tools';
      default: return 'Other Tools';
    }
  };

  // Get service names for credential dropdown
  const getAllServiceNames = () => {
    const services = [];
    
    Object.values(categorizedTools).forEach(category => {
      category.forEach(tool => {
        services.push(tool.name);
      });
    });
    
    return services;
  };
  
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
      // Check for preload-exposed ipcRenderer first (modern Electron apps)
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
    
      // Try legacy remote approach if IPC not available
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
      
      // Try fallback using a workaround - create a file input that can select directories
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.directory = true;
        
        input.onchange = (e) => {
          if (e.target.files.length > 0) {
            // Get the directory path from the first file
            const filePath = e.target.files[0].path;
            const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
            
            setMediaLibraryPath(dirPath);
          }
        };
        
        input.click();
      } catch (fallbackError) {
        console.error('Fallback method failed:', fallbackError);
        showMessage('Directory browsing is not available in this environment');
      }
    }
  };

  // Add a function to clear a keybinding - place this near the other keybinding handlers
  const clearKeybinding = (key) => {
    // Remove the lowercase conversion to maintain the original case
    console.log(`Clearing keybinding for ${key}`);
    
    // Update keybindings state - set to empty string
    setKeybindings(prev => {
      const updatedBindings = {
        ...prev,
        [key]: ''
      };
      
      // Save to localStorage
      localStorage.setItem('keybindings', JSON.stringify(updatedBindings));
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('keybindingsChanged', { 
        detail: updatedBindings 
      }));
      
      return updatedBindings;
    });
    
    // Show success message
    showMessage('Keybinding removed!');
  };

  // Utility function to show success/error messages
  const showMessage = (message, duration = 3000) => {
    setSuccessMessageContent(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), duration);
  };

  // Cookie management functions
  const loadAllCookies = async () => {
    if (!window.electron?.getAllCookies) {
      console.log('Cookie management API not available');
      return;
    }
    
    setLoadingCookies(true);
    try {
      // Get all cookies
      const allCookies = await window.electron.getAllCookies();
      setCookies(allCookies);
      
      // Extract unique domains and count cookies per domain in one pass
      const domainCounts = {};
      allCookies.forEach(cookie => {
        if (!domainCounts[cookie.domain]) {
          domainCounts[cookie.domain] = 0;
        }
        domainCounts[cookie.domain]++;
      });
      
      // Convert to array and sort by count
      const domains = Object.keys(domainCounts).sort((a, b) => 
        domainCounts[b] - domainCounts[a]
      );
      
      setCookieDomains(domains);
      
      // Show success message
      showMessage('Cookies loaded successfully');
    } catch (error) {
      console.error('Error loading cookies:', error);
      // Show error message
      showMessage('Failed to load cookies: ' + error.message);
    } finally {
      setLoadingCookies(false);
    }
  };
  
  const handleClearAllCookies = async () => {
    if (!window.electron?.clearAllCookies) {
      console.log('Cookie clearing API not available');
      return;
    }
    
    if (window.confirm('Are you sure you want to clear all cookies? This will sign you out of all services.')) {
      try {
        const result = await window.electron.clearAllCookies();
        if (result.success) {
          showMessage('All cookies cleared successfully');
          
          // Refresh the cookie list
          setCookies([]);
          setCookieDomains([]);
          setSelectedDomain(null);
          setDomainCookies([]);
        } else {
          showMessage('Failed to clear cookies: ' + result.error);
        }
      } catch (error) {
        console.error('Error clearing cookies:', error);
        showMessage('Error clearing cookies: ' + error.message);
      }
    }
  };
  
  const handleClearDomainCookies = async (domain) => {
    if (!window.electron?.clearDomainCookies) {
      console.log('Domain cookie clearing API not available');
      return;
    }
    
    if (window.confirm(`Are you sure you want to clear cookies for ${domain}? This will sign you out of this service.`)) {
      try {
        const result = await window.electron.clearDomainCookies(domain);
        if (result.success) {
          showMessage(`Cookies for ${domain} cleared successfully`);
          
          // Refresh the cookie list
          loadAllCookies();
          
          // If the cleared domain was the selected one, reset selection
          if (selectedDomain === domain) {
            setSelectedDomain(null);
            setDomainCookies([]);
          }
        } else {
          showMessage(`Failed to clear cookies for ${domain}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error clearing cookies for ${domain}:`, error);
        showMessage(`Error clearing cookies for ${domain}: ${error.message}`);
      }
    }
  };
  
  const handleViewDomainCookies = async (domain) => {
    if (!window.electron?.getDomainCookies) {
      console.log('Domain cookie API not available');
      return;
    }
    
    setSelectedDomain(domain);
    setLoadingCookies(true);
    
    try {
      const cookies = await window.electron.getDomainCookies(domain);
      setDomainCookies(cookies);
    } catch (error) {
      console.error(`Error loading cookies for ${domain}:`, error);
      showMessage(`Error loading cookies for ${domain}: ${error.message}`);
    } finally {
      setLoadingCookies(false);
    }
  };
  
  // Load cookies on component mount
  useEffect(() => {
    // Don't auto-load cookies on mount to avoid unnecessary API calls
    // User can click "Load Cookies" button if they want to see them
  }, []);

  // Add this to your render inside the return statement, before the final closing tag
  const renderCookieManagement = () => {
  return (
      <div className="mt-8 pb-8">
        <h2 className="text-xl font-semibold mb-4">Cookie Management</h2>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              Cookies store login information and preferences for websites.
              Clearing cookies will sign you out of the corresponding AI services.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={loadAllCookies}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                disabled={loadingCookies}
              >
                {loadingCookies ? 'Loading...' : 'Load Cookies'}
              </button>
              <button
                onClick={handleClearAllCookies}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                disabled={loadingCookies || cookieDomains.length === 0}
              >
                Clear All Cookies
              </button>
            </div>
          </div>
          
          {cookieDomains.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <div className="border-r pr-4">
                  <h3 className="font-medium text-lg mb-2">Domains ({cookieDomains.length})</h3>
                  <div className="max-h-96 overflow-y-auto">
                    {cookieDomains.map(domain => {
                      const count = cookies.filter(c => c.domain === domain).length;
                      return (
                        <div 
                          key={domain} 
                          className={`flex justify-between items-center p-2 rounded mb-1 cursor-pointer ${selectedDomain === domain ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                          onClick={() => handleViewDomainCookies(domain)}
                        >
                          <span className="font-medium truncate" title={domain}>
                            {domain}
                          </span>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">
                              {count} cookie{count !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearDomainCookies(domain);
                              }}
                              className="px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-lg mb-2">
                    {selectedDomain ? `Cookies for ${selectedDomain}` : 'Select a domain to view cookies'}
                  </h3>
                  
                  {selectedDomain ? (
                    <div className="max-h-96 overflow-y-auto">
                      {loadingCookies ? (
                        <div className="text-center py-4">Loading cookies...</div>
                      ) : domainCookies.length > 0 ? (
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500">Value</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500">Path</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainCookies.map((cookie, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-3 py-2 align-top font-medium">{cookie.name}</td>
                                <td className="px-3 py-2 align-top">
                                  <div className="max-w-[200px] break-all">
                                    {cookie.value.length > 30 
                                      ? cookie.value.substring(0, 30) + '...' 
                                      : cookie.value}
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-top text-gray-500">{cookie.path}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-4 text-gray-500">No cookies found for this domain</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">Select a domain to view cookies</div>
                  )}
                </div>
              </div>
            </div>
          ) : loadingCookies ? (
            <div className="text-center py-8">Loading cookies...</div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Click "Load Cookies" to view and manage cookies
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 settings-container">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>
      
      {/* API Keys Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Keys</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
          <form onSubmit={handleSaveAPIKey} className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Provider
              </label>
              <select
                className="w-full p-2 border rounded"
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="replicate">Replicate</option>
                <option value="stability">Stability AI</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="midjourney">Midjourney</option>
              </select>
            </div>
            <div className="w-full md:w-2/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
            </div>
            <button
              type="submit"
              className="md:self-end bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4 md:mt-0"
            >
              Save Key
            </button>
          </form>
        </div>
        </div>
        
        {/* Media Library Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Media Library Settings</h2>
          
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
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <p className="font-medium">Important:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>If no directory is set, uploaded images will only be stored in the app (not on your filesystem)</li>
                  <li>When a directory is set, uploaded images will be saved directly to that folder</li>
                  <li>Make sure you have write permissions for the selected directory</li>
                </ul>
              </div>
            </div>
            
            <button
              type="submit"
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
            >
              Save Media Library Path
            </button>
          </form>
        </div>
        
        {/* Keybindings Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
          
          <div className="mb-5">
            <h3 className="text-lg font-medium mb-2">Global Shortcuts</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-4 border-b">Action</th>
                  <th className="text-left py-2 px-4 border-b">Shortcut</th>
                  <th className="text-left py-2 px-4 border-b">Edit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-4 border-b">Open Notepad</td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'openNotes' ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1"
                        value={newKey}
                        placeholder="Press a key..." 
                        onKeyDown={handleKeybindingChange}
                        onChange={() => {}}
                      />
                    ) : (
                      <kbd className={`px-2 py-1 rounded ${keybindings.openNotes ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
                        {keybindings.openNotes || 'Not set'}
                      </kbd>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'openNotes' ? (
                      <button 
                        className="text-green-600 hover:text-green-800 mr-2"
                        onClick={saveKeybinding}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEditingKeybinding('openNotes')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {keybindings.openNotes && (
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => clearKeybinding('openNotes')}
                            title="Clear shortcut"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b">Open Media Library</td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'toggleMediaLibrary' ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1"
                        value={newKey}
                        placeholder="Press a key..." 
                        onKeyDown={handleKeybindingChange}
                        onChange={() => {}}
                      />
                    ) : (
                      <kbd className={`px-2 py-1 rounded ${keybindings.toggleMediaLibrary ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
                        {keybindings.toggleMediaLibrary || 'Not set'}
                      </kbd>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'toggleMediaLibrary' ? (
                      <button 
                        className="text-green-600 hover:text-green-800 mr-2"
                        onClick={saveKeybinding}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEditingKeybinding('toggleMediaLibrary')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {keybindings.toggleMediaLibrary && (
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => clearKeybinding('toggleMediaLibrary')}
                            title="Clear shortcut"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b">Open AI Assistant</td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'openAssistant' ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1"
                        value={newKey}
                        placeholder="Press a key..." 
                        onKeyDown={handleKeybindingChange}
                        onChange={() => {}}
                      />
                    ) : (
                      <kbd className={`px-2 py-1 rounded ${keybindings.openAssistant ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
                        {keybindings.openAssistant || 'Not set'}
                      </kbd>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'openAssistant' ? (
                      <button 
                        className="text-green-600 hover:text-green-800 mr-2"
                        onClick={saveKeybinding}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEditingKeybinding('openAssistant')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {keybindings.openAssistant && (
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => clearKeybinding('openAssistant')}
                            title="Clear shortcut"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b">Toggle Recent Tools</td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'toggleRecentTools' ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1"
                        value={newKey}
                        placeholder="Press a key..." 
                        onKeyDown={handleKeybindingChange}
                        onChange={() => {}}
                      />
                    ) : (
                      <kbd className={`px-2 py-1 rounded ${keybindings.toggleRecentTools ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
                        {keybindings.toggleRecentTools || 'Not set'}
                      </kbd>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'toggleRecentTools' ? (
                      <button 
                        className="text-green-600 hover:text-green-800 mr-2"
                        onClick={saveKeybinding}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEditingKeybinding('toggleRecentTools')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {keybindings.toggleRecentTools && (
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => clearKeybinding('toggleRecentTools')}
                            title="Clear shortcut"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b">Toggle Debug Panel</td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'toggleDebug' ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1"
                        value={newKey}
                        placeholder="Press a key..." 
                        onKeyDown={handleKeybindingChange}
                        onChange={() => {}}
                      />
                    ) : (
                      <kbd className={`px-2 py-1 rounded ${keybindings.toggleDebug ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
                        {keybindings.toggleDebug || 'Not set'}
                      </kbd>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {editingKeybinding === 'toggleDebug' ? (
                      <button 
                        className="text-green-600 hover:text-green-800 mr-2"
                        onClick={saveKeybinding}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => startEditingKeybinding('toggleDebug')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {keybindings.toggleDebug && (
                          <button 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => clearKeybinding('toggleDebug')}
                            title="Clear shortcut"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Tool Shortcuts</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-4 border-b">Tool</th>
                  <th className="text-left py-2 px-4 border-b">Shortcut</th>
                  <th className="text-left py-2 px-4 border-b">Edit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categorizedTools).flatMap(([category, tools]) => 
                  tools.map(tool => (
                    <tr key={tool.id}>
                      <td className="py-2 px-4 border-b">{tool.name}</td>
                      <td className="py-2 px-4 border-b">
                        {editingKeybinding === tool.id ? (
                          <input 
                            type="text" 
                            className="w-full border rounded px-2 py-1"
                            value={newKey}
                            placeholder="Press a key..." 
                            onKeyDown={handleKeybindingChange}
                            onChange={() => {}}
                          />
                        ) : (
                          <kbd className={`px-2 py-1 rounded ${keybindings[tool.id] ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
                            {keybindings[tool.id] || 'Not set'}
                          </kbd>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {editingKeybinding === tool.id ? (
                          <button 
                            className="text-green-600 hover:text-green-800 mr-2"
                            onClick={saveKeybinding}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        ) : (
                          <div className="flex space-x-2">
                            <button 
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => startEditingKeybinding(tool.id)}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {keybindings[tool.id] && (
                              <button 
                                className="text-red-600 hover:text-red-800"
                                onClick={() => clearKeybinding(tool.id)}
                                title="Clear shortcut"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-3">
              Note: No keyboard shortcuts are set by default. You must manually configure your preferred shortcuts.
              Use any combination of modifiers (Cmd, Ctrl, Alt, Shift) along with a letter or number.
              Shortcuts will be available immediately after setting them.
            </p>
          </div>
        </div>

        {/* Credentials Manager */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Credentials Manager</h2>
          <p className="text-sm text-gray-600 mb-4">
            Securely store your login information for AI services. Passwords are encrypted and stored locally on your device.
          </p>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Add New Login</h3>
            <form onSubmit={handleAddCredential} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  value={newCredential.service}
                  onChange={(e) => handleCredentialChange('service', e.target.value)}
                  className="w-full border rounded-md py-2 px-3"
                  required
                >
                  <option value="">Select a service...</option>
                  {getAllServiceNames().map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                  <option value="custom">Custom Service</option>
                </select>
              </div>
              
              {newCredential.service === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Service Name
                  </label>
                  <input
                    type="text"
                    value={newCredential.customService || ''}
                    onChange={(e) => handleCredentialChange('customService', e.target.value)}
                    className="w-full border rounded-md py-2 px-3"
                    placeholder="Enter service name"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username/Email
                </label>
                <input
                  type="text"
                  value={newCredential.username}
                  onChange={(e) => handleCredentialChange('username', e.target.value)}
                  className="w-full border rounded-md py-2 px-3"
                  placeholder="Enter username or email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newCredential.password}
                  onChange={(e) => handleCredentialChange('password', e.target.value)}
                  className="w-full border rounded-md py-2 px-3"
                  placeholder="Enter password"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
              >
                Save Credentials
              </button>
            </form>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Saved Credentials</h3>
            {savedCredentials.length > 0 ? (
              <div className="space-y-3">
                {savedCredentials.map(cred => (
                  <div key={cred.id} className="p-3 bg-purple-50 rounded-md border-l-4 border-purple-600 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{cred.service}</div>
                      <div className="text-sm text-gray-600">{cred.username}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="text-gray-600 hover:text-gray-800 p-1"
                        onClick={() => {
                          navigator.clipboard.writeText(cred.username);
                          showMessage('Username copied to clipboard');
                        }}
                        title="Copy username"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                      {cred.password && (
                        <button
                          className="text-gray-600 hover:text-gray-800 p-1"
                          onClick={() => {
                            navigator.clipboard.writeText(cred.password);
                            showMessage('Password copied to clipboard');
                          }}
                          title="Copy password"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                      )}
                      <button
                        className="text-red-600 hover:text-red-800 p-1"
                        onClick={() => handleRemoveCredential(cred.id)}
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No saved credentials yet.
              </div>
            )}
          </div>
        </div>
        
        {/* Manage AI Tools */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Manage AI Tools</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Add New AI Tool</h3>
            <form onSubmit={handleAddSite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tool Category
                </label>
                <select
                  value={toolType}
                  onChange={(e) => setToolType(e.target.value)}
                  className="w-full border rounded-md py-2 px-3"
                >
                  <option value="llm">Language Model</option>
                  <option value="image">Image Generation</option>
                  <option value="video">Video Creation</option>
                  <option value="audio">Audio Generation</option>
                  <option value="other">Other Tools</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tool Name
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Tool Name (e.g. Midjourney)"
                  className="w-full border rounded-md py-2 px-3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  placeholder="URL (e.g. https://www.midjourney.com)"
                  className="w-full border rounded-md py-2 px-3"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
              >
                Add Tool
              </button>
            </form>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Your AI Tools</h3>
            
            {/* LLM Tools */}
            <div className="mb-6">
              <h4 className="font-medium mb-2 text-blue-600">Language Models</h4>
              <div className="space-y-3">
                {categorizedTools.llm.map(site => (
                  <div key={site.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-md border-l-4 border-blue-600">
                    <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.url}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveSite(site.id, 'llm')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Image Tools */}
            <div className="mb-6">
              <h4 className="font-medium mb-2 text-green-600">Image Generation</h4>
              <div className="space-y-3">
                {categorizedTools.image.map(site => (
                  <div key={site.id} className="flex justify-between items-center p-3 bg-green-50 rounded-md border-l-4 border-green-600">
                    <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.url}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveSite(site.id, 'image')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Video Tools */}
            <div className="mb-6">
              <h4 className="font-medium mb-2 text-red-600">Video Creation</h4>
              <div className="space-y-3">
                {categorizedTools.video.map(site => (
                  <div key={site.id} className="flex justify-between items-center p-3 bg-red-50 rounded-md border-l-4 border-red-600">
                    <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.url}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveSite(site.id, 'video')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Audio Tools */}
            <div className="mb-6">
              <h4 className="font-medium mb-2 text-amber-600">Audio Generation</h4>
              <div className="space-y-3">
                {categorizedTools.audio.map(site => (
                  <div key={site.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-md border-l-4 border-amber-600">
                    <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.url}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveSite(site.id, 'audio')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Other Tools */}
            <div>
              <h4 className="font-medium mb-2 text-purple-600">Other Tools</h4>
              <div className="space-y-3">
                {categorizedTools.other.length > 0 ? (
                  categorizedTools.other.map(site => (
                    <div key={site.id} className="flex justify-between items-center p-3 bg-purple-50 rounded-md border-l-4 border-purple-600">
                      <div>
                        <div className="font-medium">{site.name}</div>
                        <div className="text-sm text-gray-500">{site.url}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveSite(site.id, 'other')}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-gray-50 text-gray-500 rounded-md text-center">
                    No custom tools added yet. Use the form above to add your own tools.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
      {/* Add Cookie Management UI */}
      {renderCookieManagement()}

      {/* Success Message */}
        {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md animate-fade-in">
          {successMessageContent}
          </div>
        )}
    </div>
  );
};

export default Settings; 