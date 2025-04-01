import React, { useState, useEffect } from 'react';

const CredentialsSettings = ({ showMessage }) => {
  // Password management state
  const [savedCredentials, setSavedCredentials] = useState([]);
  const [newCredential, setNewCredential] = useState({
    service: '',
    username: '',
    password: '',
  });
  const [categorizedTools, setCategorizedTools] = useState({});
  
  useEffect(() => {
    // Load saved credentials from localStorage
    const saved = localStorage.getItem('savedCredentials');
    if (saved) {
      setSavedCredentials(JSON.parse(saved));
    }
    
    // Load tool data for the service dropdown
    const savedTools = localStorage.getItem('categorizedTools');
    if (savedTools) {
      setCategorizedTools(JSON.parse(savedTools));
    }
  }, []);
  
  // Save credentials to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('savedCredentials', JSON.stringify(savedCredentials));
  }, [savedCredentials]);
  
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
    showMessage('Credential removed.');
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
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Stored Credentials</h2>
          <div className="text-sm text-gray-500">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Stored locally only
            </span>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Store your login credentials for quick access to various AI tools. All credentials are stored locally on your device and never sent to any server.
          </p>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Security Note:</strong> While your passwords are stored locally, they are not encrypted. For maximum security, use your browser's password manager or a dedicated password manager instead.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add New Credential Form */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Add New Credential</h3>
          
          <form onSubmit={handleAddCredential} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                value={newCredential.service}
                onChange={(e) => handleCredentialChange('service', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a service...</option>
                {getAllServiceNames().map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
                <option value="custom">Custom (not in list)</option>
              </select>
              
              {newCredential.service === 'custom' && (
                <input
                  type="text"
                  className="w-full p-2 mt-2 border rounded"
                  placeholder="Enter service name"
                  value={newCredential.customService || ''}
                  onChange={(e) => handleCredentialChange('customService', e.target.value)}
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username / Email
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={newCredential.username}
                onChange={(e) => handleCredentialChange('username', e.target.value)}
                placeholder="Enter your username or email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={newCredential.password}
                onChange={(e) => handleCredentialChange('password', e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={!newCredential.service || !newCredential.username}
            >
              Save Credential
            </button>
          </form>
        </div>
        
        {/* Saved Credentials List */}
        <div>
          <h3 className="text-lg font-medium mb-4">Saved Credentials</h3>
          
          {savedCredentials.length === 0 ? (
            <div className="text-center p-4 bg-gray-50 rounded-md text-gray-500">
              No saved credentials yet. Add some above to get started.
            </div>
          ) : (
            <ul className="divide-y border rounded-md">
              {savedCredentials.map(credential => (
                <li key={credential.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{credential.service}</div>
                    <div className="text-sm text-gray-500">{credential.username}</div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        // Copy password to clipboard
                        navigator.clipboard.writeText(credential.password);
                        showMessage('Password copied to clipboard');
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Copy password"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveCredential(credential.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove credential"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialsSettings; 