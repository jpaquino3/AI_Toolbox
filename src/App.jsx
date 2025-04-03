import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WebViewPage from './pages/WebViewPage';
import AiAssistant from './pages/AiAssistant';
import SettingsNew from './pages/SettingsNew';
import ChatWidget from './components/ChatWidget';
import MediaLibrary from './components/MediaLibrary';
import textIcon from './assets/icons/text.svg';
import imageIcon from './assets/icons/image.svg';
import videoIcon from './assets/icons/video.svg';
import audioIcon from './assets/icons/audio.svg';
import otherIcon from './assets/icons/other.svg';

// Check if we're running in Electron
const isElectron = () => {
  return window && window.process && window.process.type;
};

// Create inline styles to ensure proper rendering
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6'
  },
  sidebar: {
    backgroundColor: '#111827',
    color: '#e5e7eb',
    transition: 'width 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    borderTopLeftRadius: '10px',
    borderBottomLeftRadius: '10px'
  },
  sidebarOpen: {
    width: '16rem'
  },
  sidebarClosed: {
    width: '5rem'
  },
  sidebarHeader: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1f2937'
  },
  sidebarTitle: {
    fontWeight: 'bold',
    fontSize: '1.25rem'
  },
  sidebarTitleHidden: {
    fontWeight: 'bold',
    fontSize: '1.25rem',
    overflow: 'hidden',
    width: 0
  },
  sidebarButton: {
    color: 'white',
    padding: '0.5rem',
    borderRadius: '0.25rem',
    cursor: 'pointer'
  },
  navigation: {
    marginTop: '1.5rem',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 5rem)',
    display: 'flex',
    flexDirection: 'column'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    marginBottom: '0.25rem',
    color: '#e5e7eb',
    textDecoration: 'none',
    borderRadius: '0.25rem',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#1f2937'
    }
  },
  activeNavLink: {
    backgroundColor: '#1f2937',
    color: '#ffffff'
  },
  navIcon: {
    marginRight: '0.75rem',
    width: '24px',
    height: '24px',
    filter: 'brightness(1.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '2px',
    borderRadius: '4px',
  },
  categoryHeader: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1f2937',
    color: '#9ca3af',
    textTransform: 'uppercase',
    fontWeight: '600',
    fontSize: '0.75rem',
    marginTop: '1rem',
    marginBottom: '0.5rem'
  },
  mainContent: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  notepadButton: {
    position: 'fixed',
    right: '90px',
    bottom: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#34d399',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    transition: 'transform 0.2s',
  },
  notepadButtonHover: {
    transform: 'scale(1.05)',
  },
  mediaLibraryButton: {
    position: 'fixed',
    right: '160px',
    bottom: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#8b5cf6',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    transition: 'transform 0.2s',
  },
  mediaLibraryButtonHover: {
    transform: 'scale(1.05)',
  },
  notepadPanel: {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '400px',
    height: '100vh',
    backgroundColor: 'white',
    boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    transform: 'translateX(0)',
    transition: 'transform 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
  },
  notepadPanelHidden: {
    transform: 'translateX(100%)',
  },
  notepadHeader: {
    padding: '15px',
    backgroundColor: '#34d399',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notepadTitle: {
    fontWeight: 'bold',
    fontSize: '1.25rem',
  },
  notepadCloseButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  notepadContent: {
    flex: 1,
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
  },
  notepadTextarea: {
    flex: 1,
    padding: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '5px',
    resize: 'none',
    fontSize: '1rem',
    lineHeight: '1.5',
    fontFamily: 'inherit',
  },
  // Add notepad tabs styles
  notepadTabs: {
    display: 'flex',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto',
  },
  notepadTab: {
    padding: '10px 15px',
    backgroundColor: '#f9fafb',
    border: 'none',
    borderRight: '1px solid #e5e7eb',
    fontSize: '0.9rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  notepadTabActive: {
    backgroundColor: 'white',
    borderBottom: '2px solid #34d399',
  },
  newTabButton: {
    padding: '10px 15px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#34d399',
  },
  closeTabButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0 5px',
    marginLeft: '5px',
  },
  // Media Library styles
  mediaPanel: {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '400px',
    height: '100vh',
    backgroundColor: 'white',
    boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    transform: 'translateX(0)',
    transition: 'transform 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
  },
  mediaPanelHidden: {
    transform: 'translateX(100%)',
  },
  mediaHeader: {
    padding: '15px',
    backgroundColor: '#60a5fa',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaTitle: {
    fontWeight: 'bold',
    fontSize: '1.25rem',
  },
  mediaCloseButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  mediaContent: {
    flex: 1,
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '15px',
  },
  mediaItem: {
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    cursor: 'grab',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    aspectRatio: '1',
  },
  mediaActions: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px',
  },
  mediaActionButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '3px',
    borderRadius: '3px',
  },
  uploadSection: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  uploadButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#60a5fa',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px',
  },
  mediaLibraryPanel: {
    position: 'fixed',
    right: '20px',
    bottom: '100px',
    width: '400px',
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
    transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
  },
  mediaLibraryPanelHidden: {
    transform: 'translateX(430px)',
    opacity: 0,
    pointerEvents: 'none',
  },
  mediaLibraryHeader: {
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaLibraryTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },
  mediaLibraryCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  mediaLibraryContent: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
};

// Add these styles for the context menu
const contextMenuStyles = {
  container: {
    position: 'fixed',
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    borderRadius: '4px',
    padding: '4px 0',
    zIndex: 9999
  },
  item: {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  itemHover: {
    backgroundColor: '#f3f4f6'
  }
};

const NavLinkWithFavicon = ({ tool, sidebarOpen, onContextMenu }) => {
  // Get current location to determine if link is active
  const location = useLocation();
  const isActive = location.pathname === `/tools/${tool.id}`;
  const [isHovered, setIsHovered] = useState(false);
  const [favicon, setFavicon] = useState(null);
  const [faviconError, setFaviconError] = useState(false);
  
  // Try to get favicon when component mounts
  useEffect(() => {
    if (tool.url) {
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
    }
  }, [tool.url]);
  
  // Combine styles for active/inactive state
  const linkStyle = {
    ...styles.navLink,
    ...(isActive ? styles.activeNavLink : {}),
    ...(isHovered && !isActive ? { backgroundColor: 'rgba(31, 41, 55, 0.5)' } : {})
  };
  
  const getIcon = () => {
    // First try to use the favicon if it exists and hasn't errored
    if (favicon && !faviconError) {
      return (
        <img 
          src={favicon} 
          alt={tool.name} 
          style={styles.navIcon} 
          crossOrigin="anonymous"
          onError={(e) => {
            console.log('Favicon failed to load, trying alternative locations or using fallback for', tool.name);
            
            // Extract the current URL to determine which alternative to try next
            const currentSrc = e.target.src;
            
            try {
              const urlObj = new URL(tool.url);
              
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
                setFaviconError(true);
              } else {
                // If we're here with an unknown path, try Google's service
                const hostname = urlObj.hostname;
                e.target.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
              }
            } catch (error) {
              console.error('Error setting alternative favicon:', error);
              setFaviconError(true);
            }
          }}
        />
      );
    }
    
    // Fallback to type-based icons
    // Check if ID is in common LLM tools
    if (tool.id.includes('chatgpt') || tool.id.includes('claude') || tool.id.includes('perplexity')) {
      return <img src={textIcon} alt="Text Icon" style={styles.navIcon} />;
    }
    
    // Check if ID is in common image tools
    if (tool.id.includes('midjourney') || tool.id.includes('stable') || tool.id.includes('dalle')) {
      return <img src={imageIcon} alt="Image Icon" style={styles.navIcon} />;
    }
    
    // Check if ID is in common video tools
    if (tool.id.includes('runway') || tool.id.includes('pika') || tool.id.includes('gen2')) {
      return <img src={videoIcon} alt="Video Icon" style={styles.navIcon} />;
    }
    
    // Check if ID is in common audio tools
    if (tool.id.includes('eleven') || tool.id.includes('mubert') || tool.id.includes('sound')) {
      return <img src={audioIcon} alt="Audio Icon" style={styles.navIcon} />;
    }
    
    // Default icon
    return <img src={otherIcon} alt="Other Icon" style={styles.navIcon} />;
  };
  
  return (
    <Link 
      to={`/tools/${tool.id}`} 
      style={linkStyle}
      className={`nav-link ${isHovered ? 'nav-link-hovered' : ''}`}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, tool)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {getIcon()}
      {sidebarOpen && <span>{tool.name}</span>}
    </Link>
  );
};

const App = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const keybindingsRegistered = useRef(false);
  // Split-screen state
  const [splitScreenTool, setSplitScreenTool] = useState(null);
  const [splitScreenVisible, setSplitScreenVisible] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, tool: null });
  const splitResizeRef = useRef(null);
  // Updated notes state
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem('notepadNotes');
    return savedNotes ? JSON.parse(savedNotes) : [
      { id: 1, title: 'Note 1', content: '' },
      { id: 2, title: 'Note 2', content: '' }
    ];
  });
  const [activeNoteId, setActiveNoteId] = useState(() => {
    const savedActiveId = localStorage.getItem('activeNoteId');
    return savedActiveId ? parseInt(savedActiveId) : (notes.length > 0 ? notes[0].id : null);
  });
  const [notepadButtonHover, setNotepadButtonHover] = useState(false);
  
  // Media library state
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibraryButtonHover, setMediaLibraryButtonHover] = useState(false);
  const [mediaItems, setMediaItems] = useState(
    JSON.parse(localStorage.getItem('mediaItems')) || [
      { id: 1, url: '/images/chatgpt.png', name: 'ChatGPT Logo' },
      { id: 2, url: '/images/claude.png', name: 'Claude Logo' },
      { id: 3, url: '/images/perplexity.png', name: 'Perplexity Logo' },
      { id: 4, url: '/images/midjourney.png', name: 'Midjourney Logo' },
    ]
  );
  const fileInputRef = useRef(null);
  
  // AI Assistant state
  const [chatOpen, setChatOpen] = useState(false);

  // Debugging state
  const [lastKeyPressed, setLastKeyPressed] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  
  // Tool history tracking
  const [toolHistory, setToolHistory] = useState([]);
  const location = useLocation();
  
  // Keybindings from localStorage
  const [keybindings, setKeybindings] = useState(() => {
    const saved = localStorage.getItem('keybindings');
    return saved ? JSON.parse(saved) : {
      // Global shortcuts with default values
      openNotes: 'Ctrl+N',
      toggleMediaLibrary: 'Ctrl+M',
      openAssistant: 'Ctrl+A',
      toggleRecentTools: 'Ctrl+T',
      toggleDebug: 'Ctrl+D',
    };
  });
  
  // Load categorized tools from localStorage or use defaults
  const loadCategorizedTools = () => {
    const saved = localStorage.getItem('categorizedTools');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Default tools
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
  };
  
  // Set up loadedTools state
  const [aiTools, setAiTools] = useState(loadCategorizedTools);
  
  // Flatten tools for route handling
  const allTools = [
    ...aiTools.llm,
    ...aiTools.image,
    ...aiTools.video,
    ...aiTools.audio,
    ...aiTools.other
  ];
  
  // Save categorized tools to localStorage when they change
  useEffect(() => {
    localStorage.setItem('categorizedTools', JSON.stringify(aiTools));
  }, [aiTools]);
  
  // Listen for changes to keybindings and tools in localStorage
  useEffect(() => {
    const handleCustomKeybindingsChange = (event) => {
      console.log('Keybindings changed:', event.detail);
      setKeybindings(event.detail);
    };
    
    const handleCustomToolsChange = (event) => {
      console.log('Tools changed:', event.detail);
      setAiTools(event.detail);
    };
    
    // Storage event listener to detect changes from Settings page
    const handleStorageChange = (e) => {
      if (e.key === 'categorizedTools') {
        console.log('Tools updated in localStorage');
        try {
          const updatedTools = JSON.parse(e.newValue);
          if (updatedTools) {
            setAiTools(updatedTools);
          }
        } catch (error) {
          console.error('Error parsing tools from localStorage:', error);
        }
      }
      
      if (e.key === 'keybindings') {
        try {
          const updatedKeybindings = JSON.parse(e.newValue);
          if (updatedKeybindings) {
            setKeybindings(updatedKeybindings);
          }
        } catch (error) {
          console.error('Error parsing keybindings from localStorage:', error);
        }
      }
    };
    
    window.addEventListener('keybindingsChanged', handleCustomKeybindingsChange);
    window.addEventListener('toolsChanged', handleCustomToolsChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('keybindingsChanged', handleCustomKeybindingsChange);
      window.removeEventListener('toolsChanged', handleCustomToolsChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Update tool history when location changes
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/tools/')) {
      setToolHistory(prev => {
        // Don't add if it's the same as the most recent
        if (prev.length > 0 && prev[0] === currentPath) return prev;
        // Add current to the beginning, limit to 5 entries
        return [currentPath, ...prev.filter(p => p !== currentPath)].slice(0, 5);
      });
    }
  }, [location.pathname]);
  
  // Add listener for custom navigation events from Settings page
  useEffect(() => {
    const handleToolNavigation = (event) => {
      const { toolId } = event.detail;
      console.log(`Custom navigation event received for tool: ${toolId}`);
      
      if (toolId) {
        navigate(`/tools/${toolId}`);
      }
    };
    
    window.addEventListener('navigate-to-tool', handleToolNavigation);
    
    return () => {
      window.removeEventListener('navigate-to-tool', handleToolNavigation);
    };
  }, [navigate]);
  
  // Function to toggle between the two most recent tools
  const toggleRecentTools = () => {
    if (toolHistory.length >= 2) {
      console.log('Toggling between', toolHistory[0], 'and', toolHistory[1]);
      navigate(toolHistory[1]);
    } else if (toolHistory.length === 1) {
      console.log('Only one tool in history, going to dashboard');
      navigate('/');
    } else {
      console.log('No tool history, going to dashboard');
      navigate('/');
    }
  };

  // Set up keyboard shortcuts with focus on making them actually work
  useEffect(() => {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = 'keyboard-feedback';
    feedback.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.8);color:white;padding:10px 20px;border-radius:4px;z-index:10000;opacity:0;transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(feedback);

    // Function to show feedback
    const showFeedback = (text) => {
      feedback.textContent = text;
      feedback.style.opacity = '1';
      
      clearTimeout(feedback._hideTimeout);
      feedback._hideTimeout = setTimeout(() => {
        feedback.style.opacity = '0';
      }, 2000);
    };

    // Register app keybindings at the browser level (highest priority)
    const registerBrowserLevelKeybindings = () => {
      // Only proceed if we have access to the Electron API
      if (!window.electron?.registerAppKeybindings) {
        console.warn('Electron API for app keybindings not available');
        return;
      }
      
      // Don't spam logs in production
      if (process.env.NODE_ENV === 'development') {
        console.log('Registering app keybindings at the browser level');
      }
      
      // Gather all keybindings
      const bindings = [];
      
      // Add global keybindings
      if (keybindings.toggleRecentTools) bindings.push(keybindings.toggleRecentTools);
      if (keybindings.openAssistant) bindings.push(keybindings.openAssistant);
      if (keybindings.openNotes) bindings.push(keybindings.openNotes);
      if (keybindings.toggleMediaLibrary) bindings.push(keybindings.toggleMediaLibrary);
      if (keybindings.toggleDebug) bindings.push(keybindings.toggleDebug);
      
      // Add tool keybindings
      allTools.forEach(tool => {
        if (keybindings[tool.id]) {
          bindings.push(keybindings[tool.id]);
        }
      });
      
      // Register with the Electron main process
      window.electron.registerAppKeybindings({
        clearExisting: true,
        bindings: bindings
      });
      
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        // Only show unique bindings to avoid duplication
        const uniqueBindings = [...new Set(bindings)].sort();
        console.log('Registered browser-level keybindings:', uniqueBindings);
      }
    };
    
    // Handler for app keybinding events from the Electron main process
    const handleAppKeybinding = (keyCombo) => {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('App keybinding triggered:', keyCombo);
      }
      
      // Match the triggered key combo with our keybindings
      if (keybindings.toggleRecentTools === keyCombo) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('SHORTCUT PRESSED - TOGGLING BETWEEN RECENT TOOLS');
        }
        toggleRecentTools();
        showFeedback(`Toggled recent tools`);
        return;
      }
      
      if (keybindings.openAssistant === keyCombo) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('SHORTCUT PRESSED - TOGGLING AI ASSISTANT', chatOpen);
        }
        setChatOpen(prevState => {
          const newState = !prevState;
          showFeedback(`AI Assistant: ${newState ? 'Opened' : 'Closed'}`);
          return newState;
        });
        return;
      }
      
      if (keybindings.openNotes === keyCombo) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('SHORTCUT PRESSED - TOGGLING NOTEPAD', notepadOpen);
        }
        setNotepadOpen(prevState => {
          const newState = !prevState;
          showFeedback(`Notepad: ${newState ? 'Opened' : 'Closed'}`);
          return newState;
        });
        return;
      }
      
      if (keybindings.toggleMediaLibrary === keyCombo) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('SHORTCUT PRESSED - TOGGLING MEDIA LIBRARY', mediaLibraryOpen);
        }
        setMediaLibraryOpen(prevState => {
          const newState = !prevState;
          showFeedback(`Media Library: ${newState ? 'Opened' : 'Closed'}`);
          return newState;
        });
        return;
      }
      
      if (keybindings.toggleDebug === keyCombo) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('SHORTCUT PRESSED - TOGGLING DEBUG');
        }
        setShowDebug(prevState => {
          const newState = !prevState;
          showFeedback(`Debug Panel: ${newState ? 'Shown' : 'Hidden'}`);
          return newState;
        });
        return;
      }
      
      // Check for tool shortcuts
      for (const tool of allTools) {
        if (keybindings[tool.id] === keyCombo) {
          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.log(`SHORTCUT PRESSED - OPENING TOOL: ${tool.name}`);
          }
          navigate(`/tools/${tool.id}`);
          showFeedback(`Opening: ${tool.name}`);
          return;
        }
      }
    };

    function handleKeyboardShortcut(e) {
      // Check if we're on Mac (use metaKey/Command) or other platform (use altKey)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Reduced logging - only log in development mode or when debug is on
      if (process.env.NODE_ENV === 'development' || showDebug) {
        console.log('KEY EVENT:', e.key, 'Code:', e.code, 'Alt:', e.altKey, 'Meta:', e.metaKey, 'Ctrl:', e.ctrlKey);
      }
      
      // Always update debug display
      setLastKeyPressed(`Key: ${e.key}, Code: ${e.code}, Alt: ${e.altKey}, Meta: ${e.metaKey}, Ctrl: ${e.ctrlKey}, isMac: ${isMac}`);
      
      // ... existing keyboard handling code ...
    }
    
    // Register browser-level keybindings
    registerBrowserLevelKeybindings();
    
    // Set up listener for browser-level keybinding events
    let removeKeybindingListener = null;
    if (window.electron?.onAppKeybindingTriggered) {
      removeKeybindingListener = window.electron.onAppKeybindingTriggered(handleAppKeybinding);
    }
    
    // Setup listener for when keybindings are updated
    let removeKeybindingsUpdatedListener = null;
    if (window.electron?.onAppKeybindingsUpdated) {
      removeKeybindingsUpdatedListener = window.electron.onAppKeybindingsUpdated((updatedBindings) => {
        console.log('App keybindings updated:', updatedBindings);
      });
    }
    
    // Process keyboard events from webviews/iframes
    function handleWebviewKeyboardEvent(e) {
      // Only log in development mode or when debug is on
      if (process.env.NODE_ENV === 'development' || showDebug) {
        console.log('Received webview keyboard event:', e.detail);
      }
      
      // Create a synthetic keyboard event that simulates the original
      const syntheticEvent = {
        key: e.detail.key,
        code: e.detail.code,
        altKey: e.detail.altKey,
        ctrlKey: e.detail.ctrlKey,
        metaKey: e.detail.metaKey,
        shiftKey: e.detail.shiftKey,
        preventDefault: () => {
          // No logging here
        },
        stopPropagation: () => {
          // No logging here
        },
        stopImmediatePropagation: () => {
          // No logging here
        },
        target: {
          tagName: 'SYNTHETIC', // Special marker to identify this as a passthrough event
          isWebviewEvent: true
        }
      };
      
      // Pass to our normal handler
      handleKeyboardShortcut(syntheticEvent);
    }
    
    // Handle messages from iframes
    function handleWindowMessage(e) {
      // Process keyboard passthrough messages
      if (e.data && e.data.type === 'aifm-keydown-passthrough') {
        // Only log in development mode or when debug is on
        if (process.env.NODE_ENV === 'development' || showDebug) {
          console.log('Received iframe keyboard message:', e.data);
        }
        
        // Create a synthetic event
        const syntheticEvent = {
          detail: e.data.detail
        };
        
        // Process using the same handler
        handleWebviewKeyboardEvent(syntheticEvent);
      }
      
      // Handle keybinding requests from child frames
      if (e.data && e.data.type === 'aifm-keybinding-request') {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Received keybinding request from:', e.data.source);
        }
        
        try {
          if (e.source) {
            // Send back the keybindings
            e.source.postMessage({
              type: 'aifm-keybinding-update',
              keybindings: keybindings
            }, '*');
            
            // Also try to directly call the function if possible
            if (e.source._receiveKeybindingCheck) {
              e.source._receiveKeybindingCheck(keybindings);
            }
          }
        } catch (err) {
          console.error('Error sending keybindings to requester:', err);
        }
      }
    }
    
    // Create a global function that webviews can call directly
    window._processToolKeyboardEvent = (keyData) => {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development' || showDebug) {
        console.log('Direct call from webview with key data:', keyData);
      }
      
      // Process like other synthetic events
      const syntheticEvent = {
        detail: keyData
      };
      
      handleWebviewKeyboardEvent(syntheticEvent);
    };
    
    // Function to broadcast current keybindings to webviews
    const broadcastKeybindingsToWebviews = () => {
      // Skip if running from file:// protocol as cross-origin restrictions will block it anyway
      if (window.location.protocol === 'file:') {
        // Only log once
        if (!broadcastKeybindingsToWebviews.fileProtocolLogged) {
          console.log('Running from file:// protocol - skipping keybinding broadcast to avoid cross-origin errors');
          broadcastKeybindingsToWebviews.fileProtocolLogged = true;
        }
        return;
      }
      
      // Get all webviews/iframes
      const frames = [
        ...document.querySelectorAll('iframe'),
        ...document.querySelectorAll('webview')
      ];
      
      // Only log first time or when frame count changes
      if (!broadcastKeybindingsToWebviews.lastFrameCount || 
          broadcastKeybindingsToWebviews.lastFrameCount !== frames.length) {
        console.log(`Broadcasting keybindings to ${frames.length} frames`);
        broadcastKeybindingsToWebviews.lastFrameCount = frames.length;
      }
      
      frames.forEach(frame => {
        try {
          // For webview elements (which we control), we can directly access
          if (frame.tagName === 'WEBVIEW') {
            // Try to directly call frame's function
            if (frame.contentWindow && frame.contentWindow._receiveKeybindingCheck) {
              frame.contentWindow._receiveKeybindingCheck(keybindings);
            }
            
            // Fallback to postMessage for webviews
            if (frame.contentWindow) {
              frame.contentWindow.postMessage({
                type: 'aifm-keybinding-update',
                keybindings: keybindings
              }, '*');
            }
          } else {
            // For iframes, try using safe postMessage with wildcard origin
            // This won't throw errors but will be blocked silently if cross-origin
            frame.contentWindow?.postMessage({
              type: 'aifm-keybinding-update',
              keybindings: keybindings
            }, '*');
          }
        } catch (err) {
          // Only log the error once per frame to avoid console spam
          if (!frame._errorLogged) {
            console.error('Error sending keybindings to frame:', err);
            frame._errorLogged = true;
          }
        }
      });
    };
    
    // Broadcast keybindings initially 
    broadcastKeybindingsToWebviews();
    
    // Set up interval to periodically broadcast keybindings (helps with dynamically loaded frames)
    // Using a longer interval (10 seconds) to reduce overhead
    const broadcastInterval = setInterval(broadcastKeybindingsToWebviews, 10000);
    
    // Use capture phase with highest priority for keyboard events
    window.addEventListener('keydown', handleKeyboardShortcut, true);
    document.addEventListener('keydown', handleKeyboardShortcut, true);
    
    // Listen for events from webviews
    document.addEventListener('aifm-keydown-passthrough', handleWebviewKeyboardEvent);
    
    // Listen for postMessage events from iframes
    window.addEventListener('message', handleWindowMessage);
    
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut, true);
      document.removeEventListener('keydown', handleKeyboardShortcut, true);
      document.removeEventListener('aifm-keydown-passthrough', handleWebviewKeyboardEvent);
      window.removeEventListener('message', handleWindowMessage);
      document.body.removeChild(feedback);
      clearInterval(broadcastInterval);
      delete window._processToolKeyboardEvent;
      
      // Clean up Electron listeners
      if (removeKeybindingListener) removeKeybindingListener();
      if (removeKeybindingsUpdatedListener) removeKeybindingsUpdatedListener();
    };
  }, [navigate, allTools, toolHistory, notepadOpen, mediaLibraryOpen, chatOpen, showDebug, toggleRecentTools, keybindings]);

  // Separate effect to update browser-level keybindings when they change
  useEffect(() => {
    // Only proceed if we have access to the Electron API
    if (!window.electron?.registerAppKeybindings) {
      console.warn('Electron API for app keybindings not available');
      return;
    }
    
    // Use a ref to track if we've already registered keybindings
    // to prevent excessive re-registrations
    if (keybindingsRegistered.current) {
      return;
    }
    
    console.log('Updating browser-level keybindings due to keybinding changes');
    
    // Gather all keybindings
    const bindings = [];
    
    // Add global keybindings
    if (keybindings.toggleRecentTools) bindings.push(keybindings.toggleRecentTools);
    if (keybindings.openAssistant) bindings.push(keybindings.openAssistant);
    if (keybindings.openNotes) bindings.push(keybindings.openNotes);
    if (keybindings.toggleMediaLibrary) bindings.push(keybindings.toggleMediaLibrary);
    if (keybindings.toggleDebug) bindings.push(keybindings.toggleDebug);
    
    // Add tool keybindings
    allTools.forEach(tool => {
      if (keybindings[tool.id]) {
        bindings.push(keybindings[tool.id]);
      }
    });
    
    // Only log sorted/unique keybindings to avoid console spam
    const uniqueBindings = [...new Set(bindings)].sort();
    console.log('Updated browser-level keybindings:', uniqueBindings);
    
    // Register with the Electron main process
    window.electron.registerAppKeybindings({
      clearExisting: true,
      bindings: bindings
    });
    
    // Mark that we've registered keybindings
    keybindingsRegistered.current = true;
  }, [keybindings, allTools]);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('notepadNotes', JSON.stringify(notes));
  }, [notes]);

  // Save active note ID to localStorage
  useEffect(() => {
    localStorage.setItem('activeNoteId', activeNoteId.toString());
  }, [activeNoteId]);

  // Enable webview file drops
  useEffect(() => {
    // Check if we have the Electron API available
    if (window.electron?.enableWebviewDrops) {
      console.log('Enabling webview file drops');
      
      // Initial setup
      window.electron.enableWebviewDrops();
      
      // Set up a periodic check for new webviews (they might be loaded dynamically)
      const webviewDropInterval = setInterval(() => {
        window.electron.enableWebviewDrops();
      }, 5000);
      
      return () => {
        clearInterval(webviewDropInterval);
      };
    }
  }, []);

  // Get the active note
  const getActiveNote = () => {
    return notes.find(note => note.id === activeNoteId) || { id: 0, title: '', content: '' };
  };

  // Handle note content change
  const handleNoteChange = (e) => {
    const content = e.target.value;
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === activeNoteId ? { ...note, content } : note
      )
    );
  };

  // Add a new note
  const addNewNote = () => {
    const newId = Date.now();
    const newNote = { 
      id: newId, 
      title: `Note ${notes.length + 1}`, 
      content: '' 
    };
    setNotes([...notes, newNote]);
    setActiveNoteId(newId);
  };

  // Delete a note
  const deleteNote = (id, e) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      // Don't delete the last note
      return;
    }
    
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    
    // If we're deleting the active note, set a new active note
    if (activeNoteId === id) {
      setActiveNoteId(updatedNotes[0].id);
    }
  };

  // Change note title
  const changeNoteTitle = (id, newTitle) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === id ? { ...note, title: newTitle } : note
      )
    );
  };

  // Handle file upload for media library
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMediaItems = [...mediaItems];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const newItem = {
          id: Date.now() + i,
          url: event.target.result, // Use data URL
          name: file.name,
          file: file // Store the file object
        };
        
        newMediaItems.push(newItem);
        setMediaItems([...newMediaItems]);
        localStorage.setItem('mediaItems', JSON.stringify(newMediaItems));
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Handle drag start for media items
  const handleDragStart = (e, item) => {
    // Set data for drag operation
    e.dataTransfer.setData('text/plain', item.name);
    e.dataTransfer.setData('text/uri-list', item.url);
    
    // Create a ghost image
    const img = new Image();
    img.src = item.url;
    e.dataTransfer.setDragImage(img, 10, 10);
    
    // Set effects
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Delete media item
  const handleDeleteMedia = (id) => {
    const updatedMedia = mediaItems.filter(item => item.id !== id);
    setMediaItems(updatedMedia);
    localStorage.setItem('mediaItems', JSON.stringify(updatedMedia));
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Combine styles for sidebar
  const sidebarStyle = {
    ...styles.sidebar,
    ...(sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed)
  };

  // In the App component, add a new ref
  const chatBtnRef = useRef(null);
  const notepadBtnRef = useRef(null);
  const mediaLibraryBtnRef = useRef(null);

  // State for context menu item hover
  const [contextMenuItemHover, setContextMenuItemHover] = useState(false);

  // Handle right-click on tool link
  const handleToolContextMenu = (e, tool) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tool
    });
  };

  // Handle closing context menu
  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, tool: null });
  };

  // Handle opening tool in split-screen
  const handleOpenInSplitScreen = (tool) => {
    setSplitScreenTool(tool);
    setSplitScreenVisible(true);
    handleCloseContextMenu();
  };

  // Handle close split-screen view
  const handleCloseSplitScreen = () => {
    setSplitScreenVisible(false);
    setSplitScreenTool(null);
  };

  // Add these refs for tracking drag state
  const dragStartX = useRef(0);
  const dragStartRatio = useRef(0);
  const isDragging = useRef(false);

  // Update the resize handle style
  const resizeHandleStyle = {
    position: 'absolute',
    left: `${splitRatio * 100}%`,
    top: 0,
    transform: 'translateX(-50%)',
    width: '20px',
    height: '100%',
    cursor: 'col-resize',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'stretch',
    touchAction: 'none'
  };

  // Style for the visual handle line
  const handleLineStyle = {
    width: '4px',
    height: '100%',
    background: '#ddd',
    transition: 'background-color 0.2s',
    borderRadius: '2px'
  };

  // Handle split-screen resize
  const handleSplitResize = (e) => {
    if (!isDragging.current || !splitResizeRef.current) return;

    const container = splitResizeRef.current.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate the new ratio based on mouse position within the container
    const newRatio = Math.max(0.2, Math.min(0.8, (e.clientX - containerRect.left) / containerRect.width));
    setSplitRatio(newRatio);

    // Update handle position immediately for smoother movement
    if (splitResizeRef.current) {
      splitResizeRef.current.style.left = `${newRatio * 100}%`;
    }
  };

  // Start resizing
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging.current = true;
    
    // Add visual feedback
    if (splitResizeRef.current) {
      const handleLine = splitResizeRef.current.querySelector('div');
      if (handleLine) {
        handleLine.style.background = '#4f46e5';
      }
      
      // Add active cursor and prevent text selection globally
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
    }
    
    // Add event listeners
    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current) return;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      requestAnimationFrame(() => {
        handleSplitResize(moveEvent);
      });
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      
      // Remove visual feedback
      if (splitResizeRef.current) {
        const handleLine = splitResizeRef.current.querySelector('div');
        if (handleLine) {
          handleLine.style.background = '#ddd';
        }
        
        // Restore normal cursor and interactions
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
      }
      
      // Clean up event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={styles.container} className="app-container">
      <div className="titlebar" />
      {/* Sidebar */}
      <div style={sidebarStyle} className="sidebar">
        <div style={styles.sidebarHeader} className="sidebar-header">
          <h1 style={sidebarOpen ? styles.sidebarTitle : styles.sidebarTitleHidden}>AI Toolbox</h1>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={styles.sidebarButton}
            className="sidebar-toggle-btn"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        
        {/* Navigation */}
        <nav style={styles.navigation} className="sidebar-nav">
          <Link 
            to="/" 
            style={styles.navLink}
            className="nav-link"
          >
            <svg style={{...styles.navIcon, stroke: '#60a5fa'}} width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {sidebarOpen && <span style={{fontWeight: 'bold'}}>Dashboard</span>}
          </Link>
          
          {/* LLM Tools */}
          <div>
            <div style={styles.categoryHeader} className="category-header">
              {sidebarOpen ? 'LLM TOOLS' : ''}
            </div>
            {aiTools.llm.map(tool => (
              <NavLinkWithFavicon 
                key={tool.id} 
                tool={tool} 
                sidebarOpen={sidebarOpen} 
                onContextMenu={handleToolContextMenu}
              />
            ))}
          </div>
          
          {/* Image Tools */}
          <div>
            <div style={styles.categoryHeader} className="category-header">
              {sidebarOpen ? 'IMAGE TOOLS' : ''}
            </div>
            {aiTools.image.map(tool => (
              <NavLinkWithFavicon 
                key={tool.id} 
                tool={tool} 
                sidebarOpen={sidebarOpen} 
                onContextMenu={handleToolContextMenu}
              />
            ))}
          </div>
          
          {/* Video Tools */}
          <div>
            <div style={styles.categoryHeader} className="category-header">
              {sidebarOpen ? 'VIDEO TOOLS' : ''}
            </div>
            {aiTools.video.map(tool => (
              <NavLinkWithFavicon 
                key={tool.id} 
                tool={tool} 
                sidebarOpen={sidebarOpen} 
                onContextMenu={handleToolContextMenu}
              />
            ))}
          </div>
          
          {/* Audio Tools */}
          <div>
            <div style={styles.categoryHeader} className="category-header">
              {sidebarOpen ? 'AUDIO TOOLS' : ''}
            </div>
            {aiTools.audio.map(tool => (
              <NavLinkWithFavicon 
                key={tool.id} 
                tool={tool} 
                sidebarOpen={sidebarOpen} 
                onContextMenu={handleToolContextMenu}
              />
            ))}
          </div>
          
          {/* Other Tools */}
          <div>
            <div style={styles.categoryHeader} className="category-header">
              {sidebarOpen ? 'OTHER TOOLS' : ''}
            </div>
            {aiTools.other.map(tool => (
              <NavLinkWithFavicon 
                key={tool.id} 
                tool={tool} 
                sidebarOpen={sidebarOpen} 
                onContextMenu={handleToolContextMenu}
              />
            ))}
          </div>
          
          {/* AI Assistant Link */}
          <Link 
            to="/assistant" 
            style={{...styles.navLink, marginTop: '1rem'}}
            className="nav-link assistant-link"
          >
            <svg style={{...styles.navIcon, stroke: '#a78bfa'}} width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {sidebarOpen && <span style={{fontWeight: 'bold'}}>AI Assistant</span>}
          </Link>
          
          {/* Settings Link */}
          <Link 
            to="/settings" 
            style={{...styles.navLink, marginTop: '1rem'}}
            className="nav-link settings-link"
          >
            <svg style={{...styles.navIcon, stroke: '#9ca3af'}} width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {sidebarOpen && <span style={{fontWeight: 'bold'}}>Settings</span>}
          </Link>
        </nav>
      </div>
      
      {/* Main Content */}
      <div style={styles.mainContent} className="main-content">
        {splitScreenVisible ? (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${splitRatio * 100}%`, 
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Routes>
                <Route path="/" element={<Dashboard aiTools={aiTools} />} />
                <Route path="/tools/:toolId" element={<WebViewPage aiTools={allTools} />} />
                <Route path="/assistant" element={<AiAssistant />} />
                <Route path="/settings" element={<SettingsNew />} />
              </Routes>
            </div>
            
            <div 
              ref={splitResizeRef}
              style={resizeHandleStyle}
              onMouseDown={startResize}
            >
              <div style={handleLineStyle} />
            </div>

            <div style={{ 
              width: `${(1 - splitRatio) * 100}%`, 
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {splitScreenTool && (
                <>
                  <button 
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      zIndex: 1000,
                      background: 'rgba(200, 200, 200, 0.8)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={handleCloseSplitScreen}
                  >
                    ×
                  </button>
                  <WebViewPage aiTools={[splitScreenTool]} />
                </>
              )}
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard aiTools={aiTools} />} />
            <Route path="/tools/:toolId" element={<WebViewPage aiTools={allTools} />} />
            <Route path="/assistant" element={<AiAssistant />} />
            <Route path="/settings" element={<SettingsNew />} />
          </Routes>
        )}
      </div>
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div style={{
          ...contextMenuStyles.container,
          top: `${contextMenu.y}px`,
          left: `${contextMenu.x}px`
        }}>
          <div 
            style={{
              ...contextMenuStyles.item,
              ...(contextMenuItemHover ? contextMenuStyles.itemHover : {})
            }}
            onClick={() => handleOpenInSplitScreen(contextMenu.tool)}
            onMouseEnter={() => setContextMenuItemHover(true)}
            onMouseLeave={() => setContextMenuItemHover(false)}
          >
            Open in Split Screen
          </div>
        </div>
      )}
      
      {/* Click catcher to close context menu */}
      {contextMenu.visible && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9998
          }}
          onClick={handleCloseContextMenu}
        />
      )}
      
      {/* Debug display */}
      {showDebug && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 2000,
          fontSize: '12px'
        }}>
          <div>Last key pressed: {lastKeyPressed}</div>
          <div>Press Alt+D to toggle this display</div>
        </div>
      )}
      
      {/* Notepad Button */}
      <div
        className="notepad-button"
        style={{...styles.notepadButton, ...(notepadButtonHover ? styles.notepadButtonHover : {})}}
        onClick={() => setNotepadOpen(!notepadOpen)}
        onMouseEnter={() => setNotepadButtonHover(true)}
        onMouseLeave={() => setNotepadButtonHover(false)}
        ref={notepadBtnRef}
      >
        <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          <line x1="8" y1="10" x2="16" y2="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          <line x1="8" y1="14" x2="16" y2="14" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          <line x1="8" y1="18" x2="12" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </div>
      
      {/* Media Library Button */}
      <div
        className="media-library-button"
        style={{...styles.mediaLibraryButton, ...(mediaLibraryButtonHover ? styles.mediaLibraryButtonHover : {})}}
        onClick={() => setMediaLibraryOpen(!mediaLibraryOpen)}
        onMouseEnter={() => setMediaLibraryButtonHover(true)}
        onMouseLeave={() => setMediaLibraryButtonHover(false)}
        ref={mediaLibraryBtnRef}
      >
        <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </div>
      
      {/* Media Library Panel */}
      <MediaLibrary 
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
      />
      
      {/* Notepad Panel with Tabs */}
      <div style={{
        ...styles.notepadPanel,
        ...(notepadOpen ? {} : styles.notepadPanelHidden)
      }}>
        <div style={styles.notepadHeader}>
          <h2 style={styles.notepadTitle}>Notepad</h2>
          <button 
            style={styles.notepadCloseButton}
            onClick={() => setNotepadOpen(false)}
          >×</button>
        </div>
        
        {/* Note Tabs */}
        <div style={styles.notepadTabs}>
          {notes.map(note => (
            <div
              key={note.id}
              style={{
                ...styles.notepadTab,
                ...(activeNoteId === note.id ? styles.notepadTabActive : {})
              }}
              onClick={() => setActiveNoteId(note.id)}
              title={note.title}
              role="button"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveNoteId(note.id);
                }
              }}
            >
              {note.title}
              {notes.length > 1 && (
                <button 
                  style={styles.closeTabButton}
                  onClick={(e) => deleteNote(note.id, e)}
                  title="Close note"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button 
            style={styles.newTabButton}
            onClick={addNewNote}
            title="Add new note"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        
        <div style={styles.notepadContent}>
          <textarea
            style={styles.notepadTextarea}
            value={getActiveNote().content}
            onChange={handleNoteChange}
            placeholder="Write your notes here..."
          />
        </div>
      </div>
      
      {/* Chat Widget */}
      <ChatWidget 
        open={chatOpen} 
        setOpen={setChatOpen} 
        // Don't pass ref if ChatWidget doesn't support forwardRef
        // ref={chatBtnRef} 
      />
    </div>
  );
};

export default App; 