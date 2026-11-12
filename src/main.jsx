/**
 * ArkCRM — Application entry
 * ---------------------------------------------------------------------------
 * Stylesheets are imported here, in cascade order: tokens, then the global
 * reset and base layer, then the utility and form layers. Component and feature
 * CSS is imported by the component that uses it, so a page only ever loads the
 * styles it needs.
 *
 * The order matters: variables.css defines the custom properties everything
 * else consumes, and forms.css is global because .nx-alert / .nx-check /
 * .nx-form__link are used by more than one feature's forms.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import '@/styles/variables.css';
import '@/styles/global.css';
import '@/styles/utility.css';
import '@/styles/forms.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('ArkCRM could not start: #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
