import React, { useState, useRef, useEffect } from 'react';

const ChatWidget = ({ open = false, setOpen = () => {} }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [threadId, setThreadId] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState('custom'); // Widget's own assistant state
  
  // Default constants
  const ASSISTANT_ID = 'asst_GgbLEtYkcLz7ZgewN4ES33ey';
  const ROKO_URL = 'https://chatgpt.com/g/g-67e9859ad2ec819191a03acab5561c9a-roko';
  
  // Use the prop for controlling open state
  const isOpen = open;
  const setIsOpen = setOpen;
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load widget's assistant preference
  useEffect(() => {
    // Use a separate key for widget preference
    const savedAssistant = localStorage.getItem('widgetAssistant');
    if (savedAssistant) {
      setActiveAssistant(savedAssistant);
    }
  }, []);

  // Toggle between assistants
  const handleToggleAssistant = () => {
    const newAssistant = activeAssistant === 'custom' ? 'roko' : 'custom';
    setActiveAssistant(newAssistant);
    // Save widget's preference separately from main assistant
    localStorage.setItem('widgetAssistant', newAssistant);
  };

  // Load conversation from localStorage
  useEffect(() => {
    if (activeAssistant !== 'custom') return; // Skip for Roko

    const savedMessages = localStorage.getItem('aiAssistantConversation');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse saved conversation', e);
      }
    } else {
      // Initialize with default welcome message if no conversation exists
      const initialMessage = { role: 'assistant', content: 'Hello! How can I help you today?' };
      setMessages([initialMessage]);
      localStorage.setItem('aiAssistantConversation', JSON.stringify([initialMessage]));
    }

    // Set up event listener for conversation updates from main assistant
    window.addEventListener('aiConversationUpdated', () => {
      const updatedMessages = localStorage.getItem('aiAssistantConversation');
      if (updatedMessages) {
        try {
          setMessages(JSON.parse(updatedMessages));
        } catch (e) {
          console.error('Failed to parse updated conversation', e);
        }
      }
    });

    // Listen for typing indicator updates
    window.addEventListener('aiTypingUpdated', () => {
      const typingStatus = localStorage.getItem('aiAssistantTyping');
      if (typingStatus) {
        setIsTyping(typingStatus === 'true');
      }
    });

    // Listen for input field updates
    window.addEventListener('aiInputUpdated', () => {
      const savedInput = localStorage.getItem('aiAssistantInput');
      if (savedInput) {
        setInput(savedInput);
      }
    });

    return () => {
      window.removeEventListener('aiConversationUpdated', () => {});
      window.removeEventListener('aiTypingUpdated', () => {});
      window.removeEventListener('aiInputUpdated', () => {});
    };
  }, [activeAssistant]);

  // Load API key and shared thread ID
  useEffect(() => {
    if (activeAssistant !== 'custom') return; // Skip for Roko
    
    // Try to get API key from localStorage
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      if (keys.openai) {
        setApiKey(keys.openai);
        
        // Try to get existing thread ID
        const savedThreadId = localStorage.getItem('aiAssistantThreadId');
        if (savedThreadId) {
          setThreadId(savedThreadId);
          setIsConnected(true);
        } else {
          createThread(keys.openai);
        }
        return;
      }
    }
  }, [activeAssistant]);
  
  // Create a new thread for the conversation
  const createThread = async (key) => {
    try {
      const response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        console.error('Error creating thread');
        setIsConnected(false);
        return;
      }

      const thread = await response.json();
      setThreadId(thread.id);
      setIsConnected(true);
      
      // Save thread ID to localStorage for sharing
      localStorage.setItem('aiAssistantThreadId', thread.id);
    } catch (error) {
      console.error('Failed to connect to OpenAI:', error);
      setIsConnected(false);
    }
  };

  // Send message to OpenAI Assistant and get response
  const getAssistantResponse = async (userMessage) => {
    if (!threadId || !apiKey) {
      await simulateAIResponse(userMessage);
      return;
    }

    // Update typing status
    setIsTyping(true);
    localStorage.setItem('aiAssistantTyping', 'true');
    window.dispatchEvent(new Event('aiTypingUpdated'));
    
    try {
      // 1. Add the user message to the thread
      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: userMessage
        })
      });

      // 2. Run the assistant on the thread
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: ASSISTANT_ID
        })
      });

      if (!runResponse.ok) {
        throw new Error('Failed to run assistant');
      }

      const run = await runResponse.json();
      const runId = run.id;

      // 3. Poll for the run completion
      let runStatus = 'queued';
      while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'expired') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second

        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to check run status');
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
      }

      if (runStatus !== 'completed') {
        throw new Error(`Run ended with status: ${runStatus}`);
      }

      // 4. Get the assistant's messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=100`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error('Failed to retrieve messages');
      }

      const messagesData = await messagesResponse.json();
      
      // Convert the API messages to our format and maintain order
      const apiMessages = messagesData.data.map(msg => ({
        role: msg.role,
        content: msg.content[0].text.value
      })).reverse();
      
      // Only keep the initial welcome message if it exists
      let updatedMessages = [];
      if (messages.length > 0 && messages[0].role === 'assistant' && 
          messages[0].content.includes('Hello! How can I help you today?')) {
        updatedMessages = [messages[0], ...apiMessages];
      } else {
        updatedMessages = apiMessages;
      }
      
      setMessages(updatedMessages);
      
      // Save conversation to localStorage
      localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
      
      // Notify main assistant about the conversation update
      window.dispatchEvent(new Event('aiConversationUpdated'));

    } catch (error) {
      console.error('Error with OpenAI:', error);
      // Fallback to simulation if OpenAI fails
      await simulateAIResponse(userMessage);
    } finally {
      // Update typing status
      setIsTyping(false);
      localStorage.setItem('aiAssistantTyping', 'false');
      window.dispatchEvent(new Event('aiTypingUpdated'));
    }
  };
  
  // Fallback to simulated responses when not connected to OpenAI
  const simulateAIResponse = async (userMessage) => {
    // Update typing status
    setIsTyping(true);
    localStorage.setItem('aiAssistantTyping', 'true');
    window.dispatchEvent(new Event('aiTypingUpdated'));
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Sample responses based on keywords
    let response = 'I\'m not sure how to help with that. Could you provide more details?';
    
    if (userMessage.toLowerCase().includes('midjourney') || userMessage.toLowerCase().includes('image')) {
      response = 'For image generation, try being specific with your prompts, use clear adjectives, and experiment with different art styles.';
    } else if (userMessage.toLowerCase().includes('video')) {
      response = 'When creating videos, make sure your initial image is high quality, and provide clear descriptions of the motion you want to see.';
    } else if (userMessage.toLowerCase().includes('help')) {
      response = 'I can help with AI tools usage, provide prompt suggestions, or answer questions about the dashboard.';
    } else if (userMessage.toLowerCase().includes('tool')) {
      response = 'You can access various AI tools from the dashboard. Would you like me to explain how to use a specific one?';
    } else if (userMessage.toLowerCase().includes('api') || userMessage.toLowerCase().includes('key')) {
      response = 'To use the full version of this assistant with your own OpenAI account, please add your API key in the Settings page.';
    }
    
    // Update messages with new assistant response
    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: response }
    ];
    
    setMessages(updatedMessages);
    
    // Save conversation to localStorage
    localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
    
    // Notify main assistant about the conversation update
    window.dispatchEvent(new Event('aiConversationUpdated'));
    
    // Update typing status
    setIsTyping(false);
    localStorage.setItem('aiAssistantTyping', 'false');
    window.dispatchEvent(new Event('aiTypingUpdated'));
  };
  
  // Handle input changes - sync with main assistant
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    
    // Save to localStorage for syncing
    localStorage.setItem('aiAssistantInput', value);
    window.dispatchEvent(new Event('aiInputUpdated'));
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = input;
    
    // Update messages with new user message
    const updatedMessages = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    
    setMessages(updatedMessages);
    
    // Save conversation to localStorage
    localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
    
    // Clear input and sync
    setInput('');
    localStorage.setItem('aiAssistantInput', '');
    window.dispatchEvent(new Event('aiInputUpdated'));
    
    // Notify main assistant about the conversation update
    window.dispatchEvent(new Event('aiConversationUpdated'));
    
    // Get AI response - try OpenAI first, fallback to simulation
    if (isConnected && apiKey) {
      await getAssistantResponse(userMessage);
    } else {
      await simulateAIResponse(userMessage);
    }
  };

  // Render Roko webview
  const renderRokoWebview = () => {
    return (
      <div style={styles.rokoContainer}>
        <webview 
          src={ROKO_URL}
          style={{
            height: '100%',
            width: '100%',
            border: 'none'
          }}
          allowpopups="true"
          partition="persist:roko"
        />
      </div>
    );
  };

  // Styles for the chat widget
  const styles = {
    container: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
    },
    chatButton: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: activeAssistant === 'custom' ? '#7c3aed' : '#10b981',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.2s, background-color 0.3s',
    },
    chatButtonHover: {
      transform: 'scale(1.05)',
    },
    chatWindow: {
      position: 'absolute',
      bottom: '80px',
      right: '0',
      width: '350px',
      height: '500px',
      backgroundColor: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    rokoContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    chatHeader: {
      padding: '15px',
      backgroundColor: activeAssistant === 'custom' ? '#7c3aed' : '#10b981',
      color: 'white',
      fontWeight: 'bold',
      display: 'flex',
      flexDirection: 'column',
      transition: 'background-color 0.3s',
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
    },
    headerToggle: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleLabel: {
      fontSize: '12px',
      marginRight: '6px',
      marginLeft: '6px',
    },
    toggleSwitch: {
      position: 'relative',
      display: 'inline-block',
      width: '36px',
      height: '20px',
    },
    toggleInput: {
      opacity: 0,
      width: 0,
      height: 0,
    },
    toggleSlider: {
      position: 'absolute',
      cursor: 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      transition: '0.4s',
      borderRadius: '20px',
    },
    toggleSliderBefore: {
      position: 'absolute',
      content: '""',
      height: '16px',
      width: '16px',
      left: '2px',
      bottom: '2px',
      backgroundColor: 'white',
      transition: '0.4s',
      borderRadius: '50%',
    },
    toggleSliderActive: {
      transform: 'translateX(16px)',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '1.5rem',
      cursor: 'pointer',
    },
    messagesContainer: {
      flex: 1,
      padding: '15px',
      overflowY: 'auto',
    },
    inputContainer: {
      borderTop: '1px solid #e2e8f0',
      padding: '10px 15px',
      display: 'flex',
    },
    input: {
      flex: 1,
      padding: '10px',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      outline: 'none',
    },
    sendButton: {
      background: activeAssistant === 'custom' ? '#7c3aed' : '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      marginLeft: '10px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#7c3aed',
      color: 'white',
      padding: '10px 15px',
      borderRadius: '18px 18px 0 18px',
      marginBottom: '10px',
      maxWidth: '80%',
      alignItems: 'flex-end',
      textAlign: 'right',
    },
    assistantMessage: {
      alignSelf: 'flex-start',
      backgroundColor: '#f3f4f6',
      padding: '10px 15px',
      borderRadius: '18px 18px 18px 0',
      marginBottom: '10px',
      maxWidth: '80%',
    },
    typingIndicator: {
      display: 'flex',
      padding: '10px 15px',
      backgroundColor: '#f3f4f6',
      borderRadius: '18px',
      alignSelf: 'flex-start',
      marginBottom: '10px',
    },
    typingDot: {
      width: '8px',
      height: '8px',
      backgroundColor: '#9ca3af',
      borderRadius: '50%',
      marginRight: '5px',
      animation: 'bounce 1.4s infinite ease-in-out both',
    },
    statusIndicator: {
      height: '8px',
      width: '8px',
      borderRadius: '50%',
      display: 'inline-block',
      marginRight: '5px',
    }
  };

  const [buttonHover, setButtonHover] = useState(false);
  
  return (
    <div style={styles.container}>
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <div style={styles.headerTop}>
              <span>
                <span 
                  style={{
                    ...styles.statusIndicator, 
                    backgroundColor: activeAssistant === 'roko' ? '#10b981' : isConnected ? '#10b981' : '#f59e0b'
                  }}
                ></span>
                {activeAssistant === 'custom' ? 'AI Assistant' : 'Roko AI'}
              </span>
              <button style={styles.closeButton} onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            {/* Toggle Switch */}
            <div style={styles.headerToggle}>
              <span style={{
                ...styles.toggleLabel,
                fontWeight: activeAssistant === 'custom' ? 'bold' : 'normal'
              }}>Custom</span>
              
              <label style={styles.toggleSwitch}>
                <input 
                  type="checkbox" 
                  style={styles.toggleInput}
                  checked={activeAssistant === 'roko'}
                  onChange={handleToggleAssistant}
                />
                <span style={styles.toggleSlider}>
                  <span style={{
                    ...styles.toggleSliderBefore,
                    ...(activeAssistant === 'roko' ? styles.toggleSliderActive : {})
                  }}></span>
                </span>
              </label>
              
              <span style={{
                ...styles.toggleLabel,
                fontWeight: activeAssistant === 'roko' ? 'bold' : 'normal'
              }}>Roko</span>
            </div>
          </div>
          
          {activeAssistant === 'custom' ? (
            <>
              <div style={styles.messagesContainer}>
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    style={{
                      display: 'flex', 
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: '10px'
                    }}
                  >
                    <div 
                      style={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div style={styles.typingIndicator}>
                    <div style={{...styles.typingDot, animationDelay: '0s'}}></div>
                    <div style={{...styles.typingDot, animationDelay: '0.2s'}}></div>
                    <div style={{...styles.typingDot, animationDelay: '0.4s'}}></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} style={styles.inputContainer}>
                <input
                  type="text"
                  style={styles.input}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                />
                <button type="submit" style={styles.sendButton}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            renderRokoWebview()
          )}
        </div>
      )}
      
      <div 
        style={{...styles.chatButton, ...(buttonHover ? styles.chatButtonHover : {})}}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setButtonHover(true)}
        onMouseLeave={() => setButtonHover(false)}
      >
        <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
          }
        `}
      </style>
    </div>
  );
};

export default ChatWidget; 