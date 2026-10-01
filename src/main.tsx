import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'lxgw-wenkai-lite-webfont/lxgwwenkailite-regular.css'
import 'lxgw-wenkai-lite-webfont/lxgwwenkailite-bold.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
