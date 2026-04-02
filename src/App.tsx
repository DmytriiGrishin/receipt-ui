import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home } from './pages/Home'
import { Stats } from './pages/Stats'
import { Edit } from './pages/Edit'
import { ReceiptDetail } from './components/ReceiptDetail'
import { initTelegram } from './utils/telegram'
import { useEffect } from 'react'

function AppContent() {
  const location = useLocation()
  const isOverlayPage = location.pathname.startsWith('/edit') || location.pathname.startsWith('/detail')

  useEffect(() => {
    initTelegram()
  }, [])

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/edit" element={<Edit />} />
        <Route path="/edit/:id" element={<Edit />} />
        <Route path="/detail/:id" element={<ReceiptDetail />} />
      </Routes>

      {!isOverlayPage && (
        <nav className="bottom-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>Receipts</span>
          </Link>
          <Link to="/stats" className={location.pathname === '/stats' ? 'active' : ''}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span>Stats</span>
          </Link>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/receipt-ui">
      <AppContent />
    </BrowserRouter>
  )
}
