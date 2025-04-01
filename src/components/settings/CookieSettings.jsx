import React, { useState, useEffect } from 'react';

const CookieSettings = ({ showMessage, isElectron }) => {
  const [cookies, setCookies] = useState([]);
  const [cookieDomains, setCookieDomains] = useState([]);
  const [loadingCookies, setLoadingCookies] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domainCookies, setDomainCookies] = useState([]);

  useEffect(() => {
    if (isElectron()) {
      loadAllCookies();
    }
  }, []);

  const loadAllCookies = async () => {
    if (!isElectron()) {
      showMessage('Cookie management is only available in the desktop app');
      return;
    }
    
    setLoadingCookies(true);
    
    try {
      if (window.electron?.ipcRenderer) {
        const allCookies = await window.electron.ipcRenderer.invoke('get-all-cookies');
        setCookies(allCookies);
        
        // Extract unique domains
        const domains = [...new Set(allCookies.map(cookie => cookie.domain))];
        setCookieDomains(domains.sort());
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
      showMessage(`Error loading cookies: ${error.message}`);
    } finally {
      setLoadingCookies(false);
    }
  };

  const handleClearAllCookies = async () => {
    if (!isElectron()) {
      showMessage('Cookie management is only available in the desktop app');
      return;
    }
    
    if (!window.confirm('Are you sure you want to clear ALL cookies? This will log you out of all websites.')) {
      return;
    }
    
    try {
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('clear-all-cookies');
        setCookies([]);
        setCookieDomains([]);
        setSelectedDomain(null);
        setDomainCookies([]);
        showMessage('All cookies have been cleared');
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
      showMessage(`Error clearing cookies: ${error.message}`);
    }
  };

  const handleClearDomainCookies = async (domain) => {
    if (!isElectron()) return;
    
    if (!window.confirm(`Are you sure you want to clear all cookies for ${domain}? This may log you out of this website.`)) {
      return;
    }
    
    try {
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('clear-domain-cookies', domain);
        
        // Update state
        const updatedCookies = cookies.filter(cookie => !cookie.domain.includes(domain));
        setCookies(updatedCookies);
        
        // Update domains
        const updatedDomains = cookieDomains.filter(d => d !== domain);
        setCookieDomains(updatedDomains);
        
        if (selectedDomain === domain) {
          setSelectedDomain(null);
          setDomainCookies([]);
        }
        
        showMessage(`Cookies for ${domain} have been cleared`);
      }
    } catch (error) {
      console.error('Error clearing domain cookies:', error);
      showMessage(`Error clearing cookies: ${error.message}`);
    }
  };

  const handleViewDomainCookies = async (domain) => {
    if (!isElectron()) return;
    
    setSelectedDomain(domain);
    
    try {
      if (window.electron?.ipcRenderer) {
        // Filter cookies for this domain
        const domainCookies = cookies.filter(cookie => 
          cookie.domain === domain || cookie.domain.endsWith(`.${domain}`)
        );
        
        setDomainCookies(domainCookies);
      }
    } catch (error) {
      console.error('Error loading domain cookies:', error);
      showMessage(`Error loading cookies: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manage Cookies</h2>
          <div className="flex space-x-2">
            <button
              onClick={loadAllCookies}
              disabled={loadingCookies}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loadingCookies ? 'Loading...' : 'Refresh Cookies'}
            </button>
            <button
              onClick={handleClearAllCookies}
              disabled={loadingCookies || cookies.length === 0}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
            >
              Clear All Cookies
            </button>
          </div>
        </div>
        
        {!isElectron() ? (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
            Cookie management is only available in the desktop app.
          </div>
        ) : (
          <>
            {loadingCookies ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-gray-600">Loading cookies...</p>
              </div>
            ) : (
              <div className="flex">
                {/* Domain List */}
                <div className="w-1/3 border-r pr-4 max-h-96 overflow-y-auto">
                  <h3 className="font-medium mb-2">Domains</h3>
                  {cookieDomains.length === 0 ? (
                    <p className="text-gray-500 text-sm">No cookie domains found</p>
                  ) : (
                    <ul className="divide-y">
                      {cookieDomains.map(domain => (
                        <li key={domain} className="py-2">
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => handleViewDomainCookies(domain)}
                              className={`text-left ${selectedDomain === domain ? 'font-medium text-blue-600' : 'text-gray-700'}`}
                            >
                              {domain}
                            </button>
                            <button
                              onClick={() => handleClearDomainCookies(domain)}
                              className="text-red-600 hover:text-red-800"
                              title="Clear cookies for this domain"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                {/* Cookie Details */}
                <div className="w-2/3 pl-4 max-h-96 overflow-y-auto">
                  <h3 className="font-medium mb-2">
                    {selectedDomain ? `Cookies for ${selectedDomain}` : 'Cookie Details'}
                  </h3>
                  
                  {!selectedDomain ? (
                    <p className="text-gray-500 text-sm">Select a domain to view its cookies</p>
                  ) : domainCookies.length === 0 ? (
                    <p className="text-gray-500 text-sm">No cookies found for this domain</p>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        {domainCookies.length} cookies for {selectedDomain}
                      </p>
                      <ul className="divide-y border rounded-md overflow-hidden">
                        {domainCookies.map((cookie, index) => (
                          <li key={index} className="p-3 hover:bg-gray-50 text-sm">
                            <div className="font-medium">{cookie.name}</div>
                            <div className="text-gray-500 truncate" title={cookie.value}>
                              Value: {cookie.value ? cookie.value.substring(0, 30) + (cookie.value.length > 30 ? '...' : '') : '(empty)'}
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-gray-500">
                              <div>Path: {cookie.path}</div>
                              <div>Secure: {cookie.secure ? 'Yes' : 'No'}</div>
                              <div>HttpOnly: {cookie.httpOnly ? 'Yes' : 'No'}</div>
                              <div>Session: {cookie.session ? 'Yes' : 'No'}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Note: Managing cookies may affect your login status on websites. Clear cookies only if you understand the implications.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieSettings; 