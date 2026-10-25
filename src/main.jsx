import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

/* Layer order is declared in tokens.css, the first stylesheet loaded, so the
   rest never have to fight specificity to win. Keep it first. */
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import App from './App.jsx';
import { migrate } from './services/storage.js';

/* Carry saves and theme across from the v1 build, once. */
migrate();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
