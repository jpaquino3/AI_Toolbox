import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import './tailwind.css';
import App from './App';

// Add some debug logging
console.log('index.js executing');
console.log('React version:', React.version);

// Force apply some base styles to make sure rendering works
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.style.height = '100vh';
document.body.style.width = '100vw';
document.body.style.backgroundColor = '#f3f4f6';

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('Root element found, applying styles');
  rootElement.style.display = 'flex';
  rootElement.style.flexDirection = 'column';
  rootElement.style.height = '100vh';
  rootElement.style.width = '100vw';
  rootElement.style.overflow = 'hidden';
} else {
  console.error('ROOT ELEMENT NOT FOUND! This is a critical error.');
}

// Set up error boundary for the entire app
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error && this.state.error.toString()}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  console.log('Creating React root');
  const container = document.getElementById('root');
  const root = ReactDOM.createRoot(container);

  console.log('Rendering React app');
  root.render(
    <ErrorBoundary>
      <React.StrictMode>
        <HashRouter 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <App />
        </HashRouter>
      </React.StrictMode>
    </ErrorBoundary>
  );
  console.log('React render called successfully');
} catch (error) {
  console.error('FATAL ERROR RENDERING REACT:', error);
  // Display a fallback UI
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Fatal Error</h1>
        <p>The application could not be loaded:</p>
        <pre>${error.message}</pre>
      </div>
    `;
  }
} 