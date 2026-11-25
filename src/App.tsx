import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Account from './pages/Account'
import History from './pages/History'
import Home from './pages/Home'
import Material from './pages/Material'
import ReportPage from './pages/Report'
import Session from './pages/Session'
import Setup from './pages/Setup'
import { useAuthStore } from './store/auth'

export default function App() {
  useEffect(() => {
    void useAuthStore.getState().init()
  }, [])

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/material" element={<Material />} />
          <Route path="/session/:id" element={<Session />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
