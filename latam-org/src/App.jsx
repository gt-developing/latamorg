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

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-space-900">
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
          <Route path="/:section" element={<ContentListPage />} />
          <Route path="/:section/:slug" element={<ContentPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App