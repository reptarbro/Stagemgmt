import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { App } from './components/App'
import { CLOUD_ENABLED } from './lib/cloud/config'
import { supa } from './lib/cloud/client'
import '@fontsource-variable/raleway'
import '@fontsource-variable/montserrat'
import './styles/global.css'

// Init the cloud client at boot so a magic-link redirect (?code=…) is exchanged
// for a session no matter which route the app lands on. No-op when signed out.
if (CLOUD_ENABLED) supa()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </React.StrictMode>,
)

// Register the service worker for offline support (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
