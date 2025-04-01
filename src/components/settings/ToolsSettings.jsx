import React, { useState, useEffect } from 'react';

const ToolsSettings = ({ showMessage }) => {
  const [toolType, setToolType] = useState('llm');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  
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
        { id: 'kling', name: 'Kling AI', url: 'https://klingai.com/global' },
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
    
    // Dispatch a custom event to notify App.jsx directly
    window.dispatchEvent(new CustomEvent('toolsChanged', { 
      detail: updatedTools 
    }));
    
    // Show success message
    showMessage(`${newSiteName} added to ${getCategoryTitle(toolType)}!`);
    
    // Reset form
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
    
    // Show success message
    showMessage('Tool removed successfully');
  };
  
  const handleResetToolData = (toolId) => {
    // Remove saved data for this specific tool
    localStorage.removeItem(`tool_data_${toolId}`);
    localStorage.removeItem(`tool_history_${toolId}`);
    localStorage.removeItem(`tool_settings_${toolId}`);
    
    showMessage(`Data for tool has been reset`);
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
  
  return (
    <div className="space-y-6">
      {/* Add New Tool */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Tool</h2>
        
        <form onSubmit={handleAddSite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool Type
            </label>
            <select
              className="w-full border rounded-md py-2 px-3"
              value={toolType}
              onChange={(e) => setToolType(e.target.value)}
            >
              <option value="llm">Language Model</option>
              <option value="image">Image Generation</option>
              <option value="video">Video Creation</option>
              <option value="audio">Audio Generation</option>
              <option value="other">Other Tool</option>
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
      
      {/* Manage Existing Tools */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Manage AI Tools</h2>
        
        {/* LLM Tools */}
        <div className="mb-6">
          <h3 className={`font-medium mb-2 ${getCategoryTextColor('llm')}`}>Language Models</h3>
          <div className="space-y-3">
            {categorizedTools.llm.map(site => (
              <div key={site.id} className={`flex justify-between items-center p-3 rounded-md border-l-4 ${getCategoryColor('llm')}`}>
                <div>
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-gray-500">{site.url}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleResetToolData(site.id)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Reset tool data"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveSite(site.id, 'llm')}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Image Tools */}
        <div className="mb-6">
          <h3 className={`font-medium mb-2 ${getCategoryTextColor('image')}`}>Image Generation</h3>
          <div className="space-y-3">
            {categorizedTools.image.map(site => (
              <div key={site.id} className={`flex justify-between items-center p-3 rounded-md border-l-4 ${getCategoryColor('image')}`}>
                <div>
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-gray-500">{site.url}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleResetToolData(site.id)}
                    className="text-green-600 hover:text-green-800"
                    title="Reset tool data"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveSite(site.id, 'image')}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Video Tools */}
        <div className="mb-6">
          <h3 className={`font-medium mb-2 ${getCategoryTextColor('video')}`}>Video Creation</h3>
          <div className="space-y-3">
            {categorizedTools.video.map(site => (
              <div key={site.id} className={`flex justify-between items-center p-3 rounded-md border-l-4 ${getCategoryColor('video')}`}>
                <div>
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-gray-500">{site.url}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleResetToolData(site.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Reset tool data"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveSite(site.id, 'video')}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Audio Tools */}
        <div className="mb-6">
          <h3 className={`font-medium mb-2 ${getCategoryTextColor('audio')}`}>Audio Generation</h3>
          <div className="space-y-3">
            {categorizedTools.audio.map(site => (
              <div key={site.id} className={`flex justify-between items-center p-3 rounded-md border-l-4 ${getCategoryColor('audio')}`}>
                <div>
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-gray-500">{site.url}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleResetToolData(site.id)}
                    className="text-amber-600 hover:text-amber-800"
                    title="Reset tool data"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveSite(site.id, 'audio')}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Other Tools */}
        <div>
          <h3 className={`font-medium mb-2 ${getCategoryTextColor('other')}`}>Other Tools</h3>
          <div className="space-y-3">
            {categorizedTools.other.length > 0 ? (
              categorizedTools.other.map(site => (
                <div key={site.id} className={`flex justify-between items-center p-3 rounded-md border-l-4 ${getCategoryColor('other')}`}>
                  <div>
                    <div className="font-medium">{site.name}</div>
                    <div className="text-sm text-gray-500">{site.url}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleResetToolData(site.id)}
                      className="text-purple-600 hover:text-purple-800"
                      title="Reset tool data"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveSite(site.id, 'other')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
  );
};

export default ToolsSettings; 