// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './app/App';
import AppProviders from './app/providers';
import './index.css';
// Listen for the browser's install prompt before it fires.
import './features/pwa/install-prompt';

ReactDOM.createRoot(
  document.getElementById('root')!,
).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);