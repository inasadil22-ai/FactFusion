import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { startKeepAlive } from './utils/keepAlive';

// Pages

import About from './pages/About';
import AnalysisHistory from './pages/AnalysisHistory';
import Detection from './pages/Detection';
import XAIInsights from './pages/XAIInsights';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/Forgotpassword';
import ResetPassword from './pages/Resetpassword';
// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero';

import ProtectedRoute from './utils/ProtectedRoute';


const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return null;
};

startKeepAlive();

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      {/* min-h-screen + flex-col is the "glue" that keeps the footer down */}
      <div className="flex flex-col min-h-screen bg-[#020617] text-white">

        <Navbar />

        {/* main flex-grow fills the gap between Nav and Footer */}
        <main className="flex-grow flex flex-col w-full relative pt-20">
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/analysis-history" element={<AnalysisHistory />} />
              <Route path="/detection" element={<Detection />} />
              <Route path="/xai" element={<XAIInsights />} />
              <Route path="/team-dashboard" element={<Dashboard />} />
            </Route>

            <Route path="*" element={<div className="flex-grow flex items-center justify-center">404 - Not Found</div>} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;