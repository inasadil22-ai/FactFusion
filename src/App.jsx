import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import Hero from './components/Hero';
import About from './pages/About';
import AnalysisHistory from './pages/AnalysisHistory';
import Detection from './pages/Detection';
import XAIInsights from './pages/XAIInsights';
import TeamsPage from './pages/TeamsPage';
import DrawPage from './pages/DrawPage';
import TeamDashboard from './pages/TeamDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './utils/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="w-full min-h-screen bg-black text-white flex flex-col">
        <Navbar />

        <div className="flex-grow">
          <Routes>
            {/* Public Routes - Accessible without login */}
            <Route path="/" element={<Hero />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            
            {/* --- Protected Routes Wrapper --- */}
            {/* All routes nested here will require the user to be logged in */}
            <Route element={<ProtectedRoute />}>
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/draw" element={<DrawPage />} />
              <Route path="/analysis-history" element={<AnalysisHistory />} />
              <Route path="/detection" element={<Detection />} />
              <Route path="/xai" element={<XAIInsights />} />
              
              {/* Dashboards (Also Protected) */}
              <Route path="/team-dashboard" element={<TeamDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<div className="p-20 text-center text-white">Page Not Found</div>} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  );
}

export default App;