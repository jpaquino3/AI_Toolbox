import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import textIcon from '../assets/icons/text.svg';
import imageIcon from '../assets/icons/image.svg';
import videoIcon from '../assets/icons/video.svg';
import audioIcon from '../assets/icons/audio.svg';
import otherIcon from '../assets/icons/other.svg';

// Define inline styles
const styles = {
  container: {
    padding: '1.5rem',
    height: '100%',
    overflowY: 'auto',
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: '1rem',
  },
  heading: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  description: {
    fontSize: '1.125rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  welcomeBox: {
    padding: '2rem',
    marginBottom: '2.5rem',
    background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
    borderRadius: '0.75rem',
    color: 'white',
  },
  welcomeTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
  },
  welcomeText: {
    marginBottom: '1.5rem',
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
  },
  whiteButton: {
    backgroundColor: 'white',
    color: '#4f46e5',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  purpleButton: {
    backgroundColor: '#4338ca',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111827',
  },
  iconBlue: {
    color: '#2563eb',
    width: '1.5rem',
    height: '1.5rem',
  },
  iconGreen: {
    color: '#059669',
    width: '1.5rem',
    height: '1.5rem',
  },
  iconRed: {
    color: '#dc2626',
    width: '1.5rem',
    height: '1.5rem',
  },
  iconPurple: {
    color: '#9333ea',
    width: '1.5rem',
    height: '1.5rem',
  },
  iconAmber: {
    color: '#d97706',
    width: '1.5rem',
    height: '1.5rem',
  },
  iconGray: {
    color: '#6b7280',
    width: '1.5rem',
    height: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  cardBlue: {
    borderLeft: '4px solid #2563eb',
  },
  cardGreen: {
    borderLeft: '4px solid #059669',
  },
  cardRed: {
    borderLeft: '4px solid #dc2626',
  },
  cardPurple: {
    borderLeft: '4px solid #9333ea',
  },
  cardAmber: {
    borderLeft: '4px solid #d97706',
  },
  cardGray: {
    borderLeft: '4px solid #6b7280',
  },
  cardContent: {
    padding: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  cardIconContainer: {
    width: '3rem',
    height: '3rem',
    borderRadius: '9999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '1rem',
  },
  cardIconBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  cardIconGreen: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  cardIconRed: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  cardIconPurple: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  cardIconAmber: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  cardIconGray: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    color: '#6b7280',
    marginBottom: '1rem',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLaunch: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.875rem',
  },
  launchBlue: {
    color: '#2563eb',
  },
  launchGreen: {
    color: '#059669',
  },
  launchRed: {
    color: '#dc2626',
  },
  launchPurple: {
    color: '#9333ea',
  },
  launchAmber: {
    color: '#d97706',
  },
  launchGray: {
    color: '#6b7280',
  },
  cardHost: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    border: '1px dashed #d1d5db',
    color: '#6b7280',
  }
};

const ToolCard = ({ tool, type, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [favicon, setFavicon] = useState(null);
  const [faviconError, setFaviconError] = useState(false);

  // Try to get favicon on component mount
  useEffect(() => {
    if (tool.url) {
      try {
        const urlObj = new URL(tool.url);
        const faviconUrl = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
        setFavicon(faviconUrl);
      } catch (error) {
        console.error('Error parsing URL for favicon:', error);
        setFavicon(null);
      }
    }
  }, [tool.url]);
  
  // Choose card style based on tool type
  const getCardStyles = () => {
    let cardStyle = { ...styles.card };
    if (isHovered) {
      cardStyle = { ...cardStyle, ...styles.cardHover };
    }
    
    switch(type) {
      case 'llm':
        return { ...cardStyle, ...styles.cardBlue };
      case 'image':
        return { ...cardStyle, ...styles.cardGreen };
      case 'video':
        return { ...cardStyle, ...styles.cardRed };
      case 'assistant':
        return { ...cardStyle, ...styles.cardPurple };
      default:
        return cardStyle;
    }
  };
  
  // Get icon based on tool type
  const getIcon = () => {
    // First try to use the favicon if it exists and hasn't errored
    if (favicon && !faviconError) {
      return (
        <div style={{...styles.cardIconContainer, ...getIconContainerStyle()}}>
          <img 
            src={favicon} 
            alt={tool.name} 
            style={{width: '1.5rem', height: '1.5rem'}}
            onError={() => {
              console.log('Favicon failed to load, using fallback for', tool.name);
              setFaviconError(true);
            }}
          />
        </div>
      );
    }
    
    // Fallback to type-based icons
    return (
      <div style={{...styles.cardIconContainer, ...getIconContainerStyle()}}>
        {type === 'llm' && <img src={textIcon} alt="Text" style={{width: '1.5rem', height: '1.5rem'}} />}
        {type === 'image' && <img src={imageIcon} alt="Image" style={{width: '1.5rem', height: '1.5rem'}} />}
        {type === 'video' && <img src={videoIcon} alt="Video" style={{width: '1.5rem', height: '1.5rem'}} />}
        {type === 'audio' && <img src={audioIcon} alt="Audio" style={{width: '1.5rem', height: '1.5rem'}} />}
        {type === 'other' && <img src={otherIcon} alt="Other" style={{width: '1.5rem', height: '1.5rem'}} />}
      </div>
    );
  };
  
  // Helper to get the icon container style based on type
  const getIconContainerStyle = () => {
    switch(type) {
      case 'llm':
        return styles.cardIconBlue;
      case 'image':
        return styles.cardIconGreen;
      case 'video':
        return styles.cardIconRed;
      case 'audio':
        return styles.cardIconAmber;
      case 'other':
        return styles.cardIconGray;
      case 'assistant':
        return styles.cardIconPurple;
      default:
        return {};
    }
  };
  
  // Get launch style based on tool type
  const getLaunchStyle = () => {
    switch(type) {
      case 'llm':
        return styles.launchBlue;
      case 'image':
        return styles.launchGreen;
      case 'video':
        return styles.launchRed;
      case 'audio':
        return styles.launchAmber;
      case 'other':
        return styles.launchGray;
      case 'assistant':
        return styles.launchPurple;
      default:
        return {};
    }
  };
  
  // Get hostname from URL
  const getHostname = () => {
    try {
      const url = new URL(tool.url);
      return url.hostname;
    } catch (e) {
      return '';
    }
  };
  
  return (
    <div 
      style={getCardStyles()}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.cardContent}>
        <div style={styles.cardHeader}>
          {getIcon()}
          <h3 style={styles.cardTitle}>{tool.name}</h3>
        </div>
        <p style={styles.cardDescription}>
          Access {tool.name} directly in your dashboard without switching between tabs.
        </p>
        <div style={styles.cardFooter}>
          <span style={{...styles.cardLaunch, ...getLaunchStyle()}}>
            Launch →
          </span>
          <span style={styles.cardHost}>{getHostname()}</span>
        </div>
      </div>
    </div>
  );
};

const CategorySection = ({ title, description, tools, type, navigateToTool }) => {
  // Get section icon based on category type
  const getSectionIcon = () => {
    switch(type) {
      case 'llm':
        return (
          <svg style={styles.iconBlue} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'image':
        return (
          <svg style={styles.iconGreen} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg style={styles.iconRed} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'audio':
        return (
          <svg style={styles.iconAmber} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      case 'other':
        return (
          <svg style={styles.iconGray} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        {getSectionIcon()}
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      <p style={styles.description}>{description}</p>
      
      {tools.length > 0 ? (
        <div style={styles.grid}>
          {tools.map(tool => (
            <ToolCard 
              key={tool.id} 
              tool={tool} 
              type={type}
              onClick={() => navigateToTool(tool.id)} 
            />
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          No {title.toLowerCase()} tools configured yet. Add tools in Settings.
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ aiTools }) => {
  const navigate = useNavigate();

  const navigateToTool = (toolId) => {
    navigate(`/tools/${toolId}`);
  };

  // Use the categorized tools directly from aiTools object
  const llmTools = aiTools.llm || [];
  const imageTools = aiTools.image || [];
  const videoTools = aiTools.video || [];
  const audioTools = aiTools.audio || [];
  const otherTools = aiTools.other || [];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.heading}>AI Tools Dashboard</h1>
        <p style={styles.description}>
          All your favorite AI tools in one place. Access and manage multiple platforms without switching between tabs.
        </p>
      </header>
      
      {/* Welcome Box */}
      <div style={styles.welcomeBox}>
        <h2 style={styles.welcomeTitle}>Welcome to your AI Toolbox</h2>
        <p style={styles.welcomeText}>Your centralized hub for language, image, video, and audio AI tools.</p>
        <div style={styles.buttonContainer}>
          <Link to="/assistant" style={{textDecoration: 'none'}}>
            <button style={styles.whiteButton}>Ask AI Assistant</button>
          </Link>
          <Link to="/settings" style={{textDecoration: 'none'}}>
            <button style={styles.purpleButton}>Configure Tools</button>
          </Link>
        </div>
      </div>
      
      <div style={styles.sections}>
        {/* LLM Section */}
        <CategorySection 
          title="Language Models" 
          description="Chat with AI assistants to get answers, create content, or brainstorm ideas."
          tools={llmTools}
          type="llm"
          navigateToTool={navigateToTool} 
        />
        
        {/* Image Section */}
        <CategorySection 
          title="Image Generation" 
          description="Create stunning visuals, artwork, and designs with AI-powered image generators."
          tools={imageTools}
          type="image"
          navigateToTool={navigateToTool} 
        />
        
        {/* Video Section */}
        <CategorySection 
          title="Video Creation" 
          description="Transform your ideas into dynamic videos and animations using AI video tools."
          tools={videoTools}
          type="video"
          navigateToTool={navigateToTool} 
        />

        {/* Audio Section */}
        <CategorySection 
          title="Audio Generation" 
          description="Create voices, music, and sound effects with AI-powered audio tools."
          tools={audioTools}
          type="audio"
          navigateToTool={navigateToTool} 
        />

        {/* Other Tools Section */}
        <CategorySection 
          title="Other Tools" 
          description="Additional AI tools that don't fit into the categories above."
          tools={otherTools}
          type="other"
          navigateToTool={navigateToTool} 
        />
        
        {/* AI Assistant Card */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <svg style={styles.iconPurple} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h2 style={styles.sectionTitle}>AI Assistance</h2>
          </div>
          <p style={styles.description}>Get help with your AI projects, ask questions about tools, or troubleshoot issues.</p>
          
          <div style={{...styles.card, ...styles.cardPurple}} 
               onClick={() => navigate('/assistant')}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
            <div style={styles.cardContent}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIconContainer, ...styles.cardIconPurple}}>
                  <svg style={styles.iconPurple} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 style={styles.cardTitle}>AI Assistant</h3>
              </div>
              <p style={styles.cardDescription}>
                Get help with your AI projects. Ask questions about tools, get prompt suggestions, and troubleshoot issues.
              </p>
              <div style={styles.cardFooter}>
                <span style={{...styles.cardLaunch, ...styles.launchPurple}}>
                  Ask a question →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 