import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import CommunitySection from './components/Communitysection'
import Header from './components/Header'
import Hero from './components/Hero'
import HighlightsSection from './components/HighlightsSection'
import Comunidad from './pages/Comunidad'
import ContentPage from './pages/ContentPage'
import ContentListPage from './pages/ContentListPage'
import Footer from './components/Footer'
import Nosotros from './pages/Nosotros'
import SEO from './components/SEO'
import PrivateGuides from './pages/PrivateGuides'
import PrivateGuide from './pages/PrivateGuide'
import Admin from './pages/Admin'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import DashboardEvents from './pages/DashboardEvents'

function LegacyResourceRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/guias/${encodeURIComponent(slug)}`} replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-space-900">
          <Header />

          <Routes>
            <Route
              path="/"
              element={
                <>
                  <SEO />
                  <Hero />
                  <CommunitySection />
                  <HighlightsSection />
                </>
              }
            />
            <Route path="/comunidad" element={<Comunidad />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/privadas" element={<PrivateGuides />} />
            <Route path="/privadas/:role/:slug" element={<PrivateGuide />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/eventos" element={<Events />} />
            <Route path="/eventos/:id" element={<Events />} />
            <Route path="/dashboard/guias" element={<Dashboard />} />
            <Route path="/dashboard/guias/:id" element={<Dashboard />} />
            <Route path="/dashboard/eventos" element={<DashboardEvents />} />
            <Route path="/dashboard/eventos/:id" element={<DashboardEvents />} />
            <Route path="/recursos" element={<Navigate to="/guias" replace />} />
            <Route path="/recursos/:slug" element={<LegacyResourceRedirect />} />
            <Route path="/:section" element={<ContentListPage />} />
            <Route path="/:section/:slug" element={<ContentPage />} />
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
