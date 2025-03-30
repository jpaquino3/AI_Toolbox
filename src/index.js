import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import './tailwind.css';
import App from './App';

// Force apply some base styles to make sure rendering works
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.style.height = '100vh';
document.body.style.width = '100vw';
document.body.style.backgroundColor = '#f3f4f6';

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.display = 'flex';
  rootElement.style.flexDirection = 'column';
  rootElement.style.height = '100vh';
  rootElement.style.width = '100vw';
  rootElement.style.overflow = 'hidden';
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
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
); 