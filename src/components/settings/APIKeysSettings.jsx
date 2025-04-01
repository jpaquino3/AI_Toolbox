import React, { useState, useEffect } from 'react';

const APIKeysSettings = ({ showMessage }) => {
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  
  // Load saved API keys on component mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      if (keys[aiProvider]) {
        setApiKey(keys[aiProvider]);
      } else {
        setApiKey('');
      }
    }
  }, [aiProvider]);
  
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
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">API Keys</h2>
      <p className="text-gray-600 mb-4">
        Add your API keys to enable integration with various AI services.
      </p>
      
      <form onSubmit={handleSaveAPIKey} className="space-y-4">
        <div>
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
        
        <div>
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
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally on your device and is never sent to our servers.
          </p>
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Key
          </button>
        </div>
      </form>
    </div>
  );
};

export default APIKeysSettings; 