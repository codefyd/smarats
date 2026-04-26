import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// دعم GitHub Pages SPA routing
;(function() {
  var redirect = sessionStorage.redirect
  delete sessionStorage.redirect
  if (redirect && redirect !== location.href) {
    history.replaceState(null, null, redirect)
  }
})()

// معالجة query string من 404.html
if (window.location.search.includes('?/')) {
  const url = new URL(window.location)
  const path = url.search.slice(2).split('&')[0].replace(/~and~/g, '&')
  history.replaceState(null, null, url.pathname + path + url.hash)
}

const base = import.meta.env.VITE_BASE_PATH || '/'
const basename = base === '/' ? '' : base.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
