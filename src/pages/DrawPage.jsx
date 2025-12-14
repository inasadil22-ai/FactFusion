import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, CheckCircle2, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DrawPage = () => {
  const navigate = useNavigate();
  const [isDrawing, setIsDrawing] = useState(false);
  const [results, setResults] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. Check Auth
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login'); 
    } else {
      setIsAdmin(true);
    }
    
    // 2. Load existing results from Server
    fetch('http://localhost:5000/api/results')
      .then(res => res.json())
      .then(data => {
        if(data.length > 0) setResults(data);
      })
      .catch(err => console.log("No previous results"));

  }, [navigate]);

  const handleLuckyDraw = async () => {
    setIsDrawing(true);
    try {
      const response = await fetch('http://localhost:5000/api/draw', { method: 'POST' });
      const data = await response.json();
      
      setTimeout(() => {
         setResults(data.results);
         setIsDrawing(false);
      }, 1500);

    } catch (error) {
      console.error("Draw failed", error);
      setIsDrawing(false);
    }
  };

  // --- NEW RESET FUNCTION ---
  const handleReset = async () => {
      if(!window.confirm("WARNING: This will remove all assigned challenges from ALL teams. Are you sure?")) {
          return;
      }

      try {
          await fetch('http://localhost:5000/api/reset', { method: 'POST' });
          setResults(null); // Clear local state
      } catch (error) {
          console.error("Reset failed", error);
      }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500 selection:text-white">
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20">
        
        {/* Back Button */}
        <div className="flex items-center gap-2 mb-8 text-gray-500 hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/admin-dashboard')}>
            <ArrowRight className="rotate-180" size={20} /> Back to Dashboard
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-black mb-6">
            Grand <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-400">Allocation</span>
          </h1>
          <p className="text-gray-400 text-lg">
            This will randomly assign challenges to all teams.
          </p>
        </div>

        {/* Action Area */}
        <div className="flex flex-col items-center justify-center gap-6 mb-16">
            {!results ? (
                // DRAW BUTTON
                <button 
                    onClick={handleLuckyDraw} 
                    disabled={isDrawing} 
                    className={`px-12 py-6 rounded-2xl font-bold text-2xl text-white shadow-2xl flex items-center gap-4 ${isDrawing ? 'bg-gray-800 cursor-wait' : 'bg-gradient-to-r from-emerald-600 to-lime-600 hover:scale-105'}`}
                >
                   {isDrawing ? <><Shuffle className="animate-spin" /> Allocating...</> : <><Shuffle /> Initialize Draw</>}
                </button>
            ) : (
                // SUCCESS STATE + RESET BUTTON
                <div className="flex flex-col items-center gap-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold border border-emerald-500/30">
                        <CheckCircle2 /> Draw Published Successfully
                    </div>
                    
                    {/* NEW RESET BUTTON */}
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-all text-sm font-medium"
                    >
                        <RotateCcw size={16} /> Reset Allocation System
                    </button>
                </div>
            )}
        </div>

        {/* Results Grid */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {results.map((item, index) => (
                 <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-white text-lg">{item.teamName}</h3>
                        <div className="text-xs text-gray-500 mt-1">{item.members.join(", ")}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-lime-400 uppercase">Assigned</div>
                        <div className="text-sm text-gray-300 max-w-[200px] truncate">{item.assignedChallenge.title}</div>
                    </div>
                 </motion.div>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DrawPage;