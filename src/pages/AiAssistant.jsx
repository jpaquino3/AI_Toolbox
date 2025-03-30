import React, { useState, useRef, useEffect } from 'react';

const AiAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [threadId, setThreadId] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState('custom'); // 'custom' or 'roko'
  
  // Default assistant ID 
  const ASSISTANT_ID = 'asst_GgbLEtYkcLz7ZgewN4ES33ey';
  const ROKO_URL = 'https://chatgpt.com/g/g-67e9859ad2ec819191a03acab5561c9a-roko';
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load saved assistant preference
  useEffect(() => {
    const savedAssistant = localStorage.getItem('activeAssistant');
    if (savedAssistant) {
      setActiveAssistant(savedAssistant);
    }
  }, []);

  // Save assistant preference when changed
  useEffect(() => {
    localStorage.setItem('activeAssistant', activeAssistant);
  }, [activeAssistant]);

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
      const initialMessage = { role: 'assistant', content: 'Hello! I\'m your AI assistant. How can I help you with your AI generation tasks today?' };
      setMessages([initialMessage]);
      localStorage.setItem('aiAssistantConversation', JSON.stringify([initialMessage]));
    }

    // Set up event listener for conversation updates from chat widget
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
      if (savedInput !== null) {
        setInput(savedInput);
      }
    });

    return () => {
      window.removeEventListener('aiConversationUpdated', () => {});
      window.removeEventListener('aiTypingUpdated', () => {});
      window.removeEventListener('aiInputUpdated', () => {});
    };
  }, [activeAssistant]);

  // Load API key and thread ID on component mount
  useEffect(() => {
    if (activeAssistant !== 'custom') return; // Skip for Roko
    
    // Try to get API key from localStorage first
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
          setErrorMessage('');
        } else {
          createThread(keys.openai);
        }
        return;
      }
    }
    
    // If no key is found in localStorage, prompt the user to enter their key
    setErrorMessage('Please enter your OpenAI API key in the settings to use this assistant.');
  }, [activeAssistant]);

  // Handle toggle between assistants
  const handleToggleAssistant = () => {
    const newAssistant = activeAssistant === 'custom' ? 'roko' : 'custom';
    setActiveAssistant(newAssistant);
    // Dispatch custom event for ChatWidget to detect
    window.dispatchEvent(new CustomEvent('activeAssistantChanged'));
  };
  
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
        const error = await response.json();
        setErrorMessage(`Error creating thread: ${error.error?.message || 'Unknown error'}`);
        setIsConnected(false);
        return;
      }

      const thread = await response.json();
      setThreadId(thread.id);
      setIsConnected(true);
      setErrorMessage('');
      
      // Save thread ID to localStorage for sharing
      localStorage.setItem('aiAssistantThreadId', thread.id);
    } catch (error) {
      setErrorMessage(`Failed to connect to OpenAI: ${error.message}`);
      setIsConnected(false);
    }
  };

  // Send message to OpenAI Assistant and get response
  const getAssistantResponse = async (userMessage) => {
    if (!threadId || !apiKey) {
      setErrorMessage('No active thread or API key missing. Please check your settings.');
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
        const error = await runResponse.json();
        throw new Error(error.error?.message || 'Failed to run assistant');
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
          const error = await statusResponse.json();
          throw new Error(error.error?.message || 'Failed to check run status');
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
        const error = await messagesResponse.json();
        throw new Error(error.error?.message || 'Failed to retrieve messages');
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
          messages[0].content.includes('Hello! I\'m your AI assistant')) {
        updatedMessages = [messages[0], ...apiMessages];
      } else {
        updatedMessages = apiMessages;
      }
      
      setMessages(updatedMessages);
      
      // Save conversation to localStorage
      localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
      
      // Notify chat widget about the conversation update
      window.dispatchEvent(new Event('aiConversationUpdated'));

    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
      // Still add a fallback message if the API fails
      const updatedMessages = [
        ...messages,
        { role: 'assistant', content: 'Sorry, I encountered an error while processing your request. Please check your API key in settings.' }
      ];
      
      setMessages(updatedMessages);
      localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
      window.dispatchEvent(new Event('aiConversationUpdated'));
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
    
    if (userMessage.toLowerCase().includes('midjourney')) {
      response = 'Midjourney is an AI image generation tool. To use it effectively, try being specific with your prompts, use clear adjectives, and experiment with different art styles. Would you like some example prompts?';
    } else if (userMessage.toLowerCase().includes('runway') || userMessage.toLowerCase().includes('video')) {
      response = 'Runway ML is great for AI video generation. When creating videos, make sure your initial image is high quality, and provide clear descriptions of the motion you want to see. Would you like some tips for better video generation?';
    } else if (userMessage.toLowerCase().includes('pika') || userMessage.toLowerCase().includes('animation')) {
      response = 'Pika Labs is excellent for creating animations. For best results, start with a clear concept, use specific descriptions of movement, and iterate on your results. Would you like me to suggest some animation prompts?';
    } else if (userMessage.toLowerCase().includes('prompt') || userMessage.toLowerCase().includes('generate')) {
      response = 'Here are some tips for effective prompts across AI tools:\n1. Be specific with details\n2. Reference artistic styles or artists\n3. Include lighting, composition, and mood\n4. Use negative prompts to avoid unwanted elements\n5. Iterate and refine based on results';
    } else if (userMessage.toLowerCase().includes('api') || userMessage.toLowerCase().includes('key')) {
      response = 'To use the full version of this assistant with your own OpenAI account, please add your API key in the Settings page. This will connect you to your custom assistant for more personalized help.';
    }
    
    // Update messages with the simulated response
    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: response }
    ];
    
    setMessages(updatedMessages);
    
    // Save conversation to localStorage
    localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
    
    // Notify chat widget about the conversation update
    window.dispatchEvent(new Event('aiConversationUpdated'));
    
    // Update typing status
    setIsTyping(false);
    localStorage.setItem('aiAssistantTyping', 'false');
    window.dispatchEvent(new Event('aiTypingUpdated'));
  };
  
  // Handle input changes - sync with chat widget
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
    
    // Save to localStorage
    localStorage.setItem('aiAssistantConversation', JSON.stringify(updatedMessages));
    
    // Clear input and sync
    setInput('');
    localStorage.setItem('aiAssistantInput', '');
    window.dispatchEvent(new Event('aiInputUpdated'));
    
    // Notify chat widget about the conversation update
    window.dispatchEvent(new Event('aiConversationUpdated'));
    
    // Get AI response - try OpenAI first, fallback to simulation
    if (isConnected && apiKey) {
      await getAssistantResponse(userMessage);
    } else {
      // If not connected to OpenAI, use the simulation
      await simulateAIResponse(userMessage);
    }
  };
  
  // Render the Roko webview
  const renderRokoWebview = () => {
    return (
      <div className="h-full flex flex-col">
        <webview 
          src={ROKO_URL}
          style={{
            height: 'calc(100vh - 120px)',
            width: '100%',
            border: 'none'
          }}
          allowpopups="true"
          partition="persist:roko"
        />
      </div>
    );
  };
  
  // Render the custom assistant chat interface
  const renderCustomAssistant = () => {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            {/* Error message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {errorMessage}
              </div>
            )}
            
            {/* Messages */}
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white rounded-lg py-2 px-4 max-w-[80%]">
                      {message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex">
                    <div className="bg-white border rounded-lg py-2 px-4 max-w-[80%] shadow-sm">
                      {message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex">
                <div className="bg-gray-200 text-gray-900 rounded-lg py-2 px-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Message input */}
        <div className="p-4 border-t bg-white">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex">
              <input 
                type="text" 
                value={input} 
                onChange={handleInputChange}
                placeholder="Ask me about AI tools, generation techniques, or prompt ideas..."
                className="flex-1 border rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit"
                className="bg-indigo-600 text-white rounded-r-lg px-4 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              {isConnected ? 'Connected to your custom OpenAI Assistant.' : 'Running in demo mode with simulated responses. Add your API key in Settings for full features.'}
            </p>
          </div>
        </div>
      </>
    );
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">AI Assistant</h1>
          {activeAssistant === 'custom' ? (
            <>
              {!isConnected && apiKey && (
                <div className="text-sm mt-1 text-red-600">
                  Not connected to OpenAI. Check your API key in Settings.
                </div>
              )}
              {!apiKey && (
                <div className="text-sm mt-1 text-yellow-600">
                  Running in demo mode. <a href="/settings" className="underline">Add your API key</a> for full features.
                </div>
              )}
              {isConnected && (
                <div className="text-sm mt-1 text-green-600">
                  Connected to your custom OpenAI Assistant
                </div>
              )}
            </>
          ) : (
            <div className="text-sm mt-1 text-blue-600">
              Using Roko - Expert in Gen AI
            </div>
          )}
        </div>
        
        {/* Toggle switch */}
        <div className="flex items-center">
          <span className={`mr-2 text-sm ${activeAssistant === 'custom' ? 'font-bold' : ''}`}>
            Custom
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              value="" 
              className="sr-only peer" 
              checked={activeAssistant === 'roko'}
              onChange={handleToggleAssistant}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className={`ml-2 text-sm ${activeAssistant === 'roko' ? 'font-bold' : ''}`}>
            Roko
          </span>
        </div>
      </div>
      
      {activeAssistant === 'custom' ? renderCustomAssistant() : renderRokoWebview()}
    </div>
  );
};

export default AiAssistant; 