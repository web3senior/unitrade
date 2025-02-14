import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import './index.scss'
import './styles/global.scss'


import Home from './routes/Home.jsx'
import Admin from './routes/Admin.jsx'

const root = document.getElementById('root')

createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route index element={<AuthProvider><Home /></AuthProvider>} />
      <Route path="admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
)
