import { lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import './index.scss'
import './styles/global.scss'


const Home = lazy(() => import('./routes/Home.jsx'))
const Admin = lazy(() => import('./routes/Admin.jsx'))

const root = document.getElementById('root')

createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route index element={<AuthProvider><Home /></AuthProvider>} />
      <Route path="admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
)
