import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import About from './pages/About'
import CityPage from './pages/CityPage'
import ProgramPage from './pages/ProgramPage'
import ComparePage from './pages/ComparePage'
import HowItWorksPage from './pages/HowItWorksPage'
import NotFound from './pages/NotFound'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="cities/:slug" element={<CityPage />} />
          <Route path="programs/:slug" element={<ProgramPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
