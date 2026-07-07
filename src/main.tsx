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

// Register the service worker for offline support (production only), and make
// new deploys self-update: when a new SW takes control, reload once so devices
// never get stuck on a stale cached build. (The first-ever install doesn't
// reload — only genuine updates do.)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = !!navigator.serviceWorker.controller
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        reg.update()
        // Re-check for a new deploy periodically while the app is open.
        setInterval(() => reg.update().catch(() => {}), 60 * 1000)
      })
      .catch(() => {})
  })
}
