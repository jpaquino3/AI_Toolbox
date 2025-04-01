import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Import individual settings components
import GeneralSettings from '../components/settings/GeneralSettings';
import ToolsSettings from '../components/settings/ToolsSettings';
import KeybindingsSettings from '../components/settings/KeybindingsSettings';
import APIKeysSettings from '../components/settings/APIKeysSettings';
import CookieSettings from '../components/settings/CookieSettings';
import CredentialsSettings from '../components/settings/CredentialsSettings';
import MediaLibrarySettings from '../components/settings/MediaLibrarySettings';

const SettingsNew = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);

  // Helper to show success messages
  const showMessage = (message, duration = 3000) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), duration);
  };

  // Check if running in Electron on component mount
  useEffect(() => {
    const checkElectron = () => {
      if (window.electron && window.electron.isAvailable === true) return true;
      if (window.isElectronAvailable === true) return true;
      if (typeof process !== 'undefined' && process.versions && process.versions.electron) return true;
      if (navigator.userAgent.indexOf('Electron') !== -1) return true;
      return false;
    };
    
    setIsElectronEnv(checkElectron());
    console.log('Is Electron environment:', checkElectron());
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* Tabs Navigation */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium ${activeTab === 'general' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          General
        </button>
        <button 
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 font-medium ${activeTab === 'tools' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          AI Tools
        </button>
        <button 
          onClick={() => setActiveTab('keybindings')}
          className={`px-4 py-2 font-medium ${activeTab === 'keybindings' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Keyboard Shortcuts
        </button>
        <button 
          onClick={() => setActiveTab('apikeys')}
          className={`px-4 py-2 font-medium ${activeTab === 'apikeys' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          API Keys
        </button>
        <button 
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 font-medium ${activeTab === 'media' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Media Library
        </button>
        <button 
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 font-medium ${activeTab === 'credentials' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Credentials
        </button>
        <button 
          onClick={() => setActiveTab('cookies')}
          className={`px-4 py-2 font-medium ${activeTab === 'cookies' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Cookies
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'general' && (
          <GeneralSettings showMessage={showMessage} isElectron={isElectronEnv} />
        )}
        
        {activeTab === 'tools' && (
          <ToolsSettings showMessage={showMessage} />
        )}
        
        {activeTab === 'keybindings' && (
          <KeybindingsSettings showMessage={showMessage} />
        )}
        
        {activeTab === 'apikeys' && (
          <APIKeysSettings showMessage={showMessage} />
        )}
        
        {activeTab === 'media' && (
          <MediaLibrarySettings showMessage={showMessage} isElectron={isElectronEnv} />
        )}
        
        {activeTab === 'credentials' && (
          <CredentialsSettings showMessage={showMessage} />
        )}
        
        {activeTab === 'cookies' && (
          <CookieSettings showMessage={showMessage} isElectron={isElectronEnv} />
        )}
      </div>
      
      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md animate-fade-in">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default SettingsNew; 