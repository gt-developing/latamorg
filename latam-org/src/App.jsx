import { BrowserRouter, Route, Routes } from 'react-router-dom'
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
            <Route path="/dashboard/guias" element={<Dashboard />} />
            <Route path="/dashboard/guias/:id" element={<Dashboard />} />
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
