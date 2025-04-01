import React, { useState, useEffect } from 'react';

const KeybindingsSettings = ({ showMessage }) => {
  // Keybinding state
  const [keybindings, setKeybindings] = useState(() => {
    const saved = localStorage.getItem('keybindings');
    return saved ? JSON.parse(saved) : {
      // Global shortcuts
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
  const [categorizedTools, setCategorizedTools] = useState({});
  
  useEffect(() => {
    // Save keybindings to localStorage
    localStorage.setItem('keybindings', JSON.stringify(keybindings));
    
    // Load categorized tools from localStorage
    const saved = localStorage.getItem('categorizedTools');
    if (saved) {
      setCategorizedTools(JSON.parse(saved));
    }
  }, [keybindings]);
  
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
    
    // Determine the key display name
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
  };

  const saveKeybinding = () => {
    if (!editingKeybinding || !newKey) return;
    
    // Global shortcuts use camelCase, tools use lowercase
    // Determine if this is a global shortcut
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
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('keybindingsChanged', { 
        detail: updatedBindings 
      }));
      
      return updatedBindings;
    });
    
    setEditingKeybinding(null);
    setNewKey('');
    
    showMessage('Keybinding updated!');
  };
  
  const clearKeybinding = (key) => {
    setKeybindings(prev => {
      const updatedBindings = {
        ...prev,
        [key]: ''
      };
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('keybindingsChanged', { 
        detail: updatedBindings 
      }));
      
      return updatedBindings;
    });
    
    showMessage(`Shortcut for ${key} cleared`);
  };
  
  const handleResetKeybindings = () => {
    if (window.confirm('Are you sure you want to reset all keyboard shortcuts to default?')) {
      const defaultKeybindings = {
        // Global shortcuts
        openNotes: '',
        toggleMediaLibrary: '',
        openAssistant: '',
        toggleRecentTools: '',
        toggleDebug: '',
        
        // Tool shortcuts
        // ... (all empty by default)
      };
      
      setKeybindings(defaultKeybindings);
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('keybindingsChanged', { 
        detail: defaultKeybindings 
      }));
      
      showMessage('All keyboard shortcuts have been reset.');
    }
  };
  
  // Helper function to get color based on category
  const getCategoryColor = (category) => {
    switch(category) {
      case 'llm': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'image': return 'bg-green-50 text-green-700 border-green-200';
      case 'video': return 'bg-red-50 text-red-700 border-red-200';
      case 'audio': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'other': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
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
  
  // All global shortcuts
  const globalShortcuts = [
    { id: 'openNotes', name: 'Open Notepad' },
    { id: 'toggleMediaLibrary', name: 'Open Media Library' },
    { id: 'openAssistant', name: 'Open AI Assistant' },
    { id: 'toggleRecentTools', name: 'Show Recent Tools' },
    { id: 'toggleDebug', name: 'Toggle Debug Mode' }
  ];
  
  // Renders a keybinding row for both global and tool shortcuts
  const renderKeybindingRow = (id, displayName, className = '') => {
    return (
      <tr className={`border-t border-gray-200 ${className}`}>
        <td className="py-3 px-4">{displayName}</td>
        <td className="py-3 px-4 w-[140px] text-center">
          {editingKeybinding === id ? (
            <input 
              type="text" 
              className="w-full border rounded px-2 py-1"
              value={newKey}
              placeholder="Press key combination..." 
              onKeyDown={handleKeybindingChange}
              onChange={() => {}}
            />
          ) : (
            <kbd className={`px-2 py-1 rounded w-[100px] inline-block text-center ${keybindings[id] ? 'bg-gray-100' : 'bg-red-50 text-red-600'}`}>
              {keybindings[id] || 'Not set'}
            </kbd>
          )}
        </td>
        <td className="py-3 px-4 text-right w-[80px]">
          {editingKeybinding === id ? (
            <button 
              className="text-green-600 hover:text-green-800 mr-2"
              onClick={saveKeybinding}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : (
            <div className="flex justify-end space-x-2">
              <button 
                className="text-blue-600 hover:text-blue-800"
                onClick={() => startEditingKeybinding(id)}
                title="Edit shortcut"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              {keybindings[id] && (
                <button 
                  className="text-red-600 hover:text-red-800"
                  onClick={() => clearKeybinding(id)}
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
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={handleResetKeybindings}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
          >
            Reset All
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Configure keyboard shortcuts to quickly access tools and features. Press key combinations after clicking Edit.
        </p>
        
        {/* Global Shortcuts */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Global Shortcuts</h3>
          <div className="bg-gray-50 rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-2 px-4 font-medium">Action</th>
                  <th className="text-center py-2 px-4 font-medium w-[140px]">Shortcut</th>
                  <th className="text-right py-2 px-4 font-medium w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {globalShortcuts.map(shortcut => (
                  renderKeybindingRow(shortcut.id, shortcut.name)
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Tool Shortcuts */}
        <div>
          <h3 className="text-lg font-medium mb-3">Tool Shortcuts</h3>
          <p className="text-sm text-gray-500 mb-3">
            Configure keyboard shortcuts to quickly open specific tools. Changes will take effect immediately.
          </p>
          
          {Object.keys(categorizedTools).length > 0 ? (
            <div className="space-y-6">
              {/* LLM Tools */}
              {categorizedTools.llm && categorizedTools.llm.length > 0 && (
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <div className={`py-2 px-4 font-medium ${getCategoryColor('llm')}`}>
                    {getCategoryTitle('llm')}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {categorizedTools.llm.map(tool => (
                        renderKeybindingRow(tool.id, tool.name)
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Image Tools */}
              {categorizedTools.image && categorizedTools.image.length > 0 && (
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <div className={`py-2 px-4 font-medium ${getCategoryColor('image')}`}>
                    {getCategoryTitle('image')}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {categorizedTools.image.map(tool => (
                        renderKeybindingRow(tool.id, tool.name)
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Video Tools */}
              {categorizedTools.video && categorizedTools.video.length > 0 && (
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <div className={`py-2 px-4 font-medium ${getCategoryColor('video')}`}>
                    {getCategoryTitle('video')}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {categorizedTools.video.map(tool => (
                        renderKeybindingRow(tool.id, tool.name)
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Audio Tools */}
              {categorizedTools.audio && categorizedTools.audio.length > 0 && (
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <div className={`py-2 px-4 font-medium ${getCategoryColor('audio')}`}>
                    {getCategoryTitle('audio')}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {categorizedTools.audio.map(tool => (
                        renderKeybindingRow(tool.id, tool.name)
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Other Tools */}
              {categorizedTools.other && categorizedTools.other.length > 0 && (
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <div className={`py-2 px-4 font-medium ${getCategoryColor('other')}`}>
                    {getCategoryTitle('other')}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {categorizedTools.other.map(tool => (
                        renderKeybindingRow(tool.id, tool.name)
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-md text-gray-500">
              No tools available. Add tools in the AI Tools tab.
            </div>
          )}
        </div>
        
        {/* Editing Dialog */}
        {editingKeybinding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Set Keyboard Shortcut</h3>
              <p className="text-gray-600 mb-4">
                Press a key combination (with at least one modifier key: Ctrl, Alt, Shift, or Cmd)
              </p>
              <div className="mb-4">
                <input 
                  type="text" 
                  className="w-full border-2 rounded px-3 py-2 text-center text-lg font-mono"
                  value={newKey}
                  placeholder="Press keys..." 
                  onKeyDown={handleKeybindingChange}
                  onChange={() => {}}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingKeybinding(null)}
                  className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveKeybinding}
                  disabled={!newKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeybindingsSettings; 