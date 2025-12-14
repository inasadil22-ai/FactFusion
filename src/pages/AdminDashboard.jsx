import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Lock, Unlock, LogOut, FileText, Download, X, Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Submissions State
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Initial Load
  useEffect(() => {
    fetch('http://localhost:5000/api/lock-status')
      .then(res => res.json())
      .then(data => setIsLocked(data.isLocked));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleLock = async (newStatus) => {
    if (newStatus === true && !window.confirm("ARE YOU SURE? This will lock all team dashboards.")) return;
    setLoading(true);
    try {
        const res = await fetch('http://localhost:5000/api/toggle-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lock: newStatus })
        });
        const data = await res.json();
        setIsLocked(data.isLocked);
    } catch (error) { console.error("Error"); } 
    finally { setLoading(false); }
  };

  // 2. Fetch All Submissions
  const fetchSubmissions = async () => {
      try {
          const res = await fetch('http://localhost:5000/api/all-uploads');
          const data = await res.json();
          // Sort by newest first
          setSubmissions(data.reverse());
          setShowSubmissions(true);
      } catch (error) { console.error("Failed to load submissions"); }
  };

  const filteredSubmissions = submissions.filter(sub => 
      sub.team_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px]" />
      
      <div className="relative z-10 max-w-6xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
          <h1 className="text-4xl font-black">Admin <span className="text-red-500">Control Center</span></h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Allocation */}
          <div onClick={() => navigate('/draw')} className="group cursor-pointer bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-emerald-500/50 transition-all">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform"><Shuffle size={24} /></div>
            <h2 className="text-2xl font-bold mb-2">Manage Allocation</h2>
            <p className="text-gray-400 text-sm">Shuffle teams and assign challenges.</p>
          </div>

          {/* Card 2: Submissions (NEW) */}
          <div onClick={fetchSubmissions} className="group cursor-pointer bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform"><FileText size={24} /></div>
            <h2 className="text-2xl font-bold mb-2">View Submissions</h2>
            <p className="text-gray-400 text-sm">Access files uploaded by all teams.</p>
          </div>

          {/* Card 3: Event Lock */}
          <div className={`p-8 rounded-3xl border transition-all relative overflow-hidden ${isLocked ? 'bg-red-900/10 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isLocked ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {isLocked ? <Lock size={24} /> : <Unlock size={24} />}
                </div>
                {isLocked && <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LOCKED</span>}
            </div>
            <h2 className="text-2xl font-bold mb-4">{isLocked ? "Event Locked" : "Event Active"}</h2>
            <button onClick={() => toggleLock(!isLocked)} disabled={loading} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isLocked ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'}`}>
                {isLocked ? "Unlock System" : "LOCK DASHBOARDS"}
            </button>
          </div>
        </div>
      </div>

      {/* --- SUBMISSIONS MODAL --- */}
      <AnimatePresence>
        {showSubmissions && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0A0A0A] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    
                    {/* Modal Header */}
                    <div className="p-8 border-b border-white/10 flex justify-between items-center bg-[#111]">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Project Submissions</h2>
                            <p className="text-gray-400 text-sm">Total Files: {submissions.length}</p>
                        </div>
                        <button onClick={() => setShowSubmissions(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 bg-[#0A0A0A] border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by team name or filename..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>

                    {/* Table / List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredSubmissions.length > 0 ? (
                            filteredSubmissions.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-lg">{sub.team_username}</div>
                                            <div className="text-sm text-gray-400 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><FileText size={12}/> {sub.original_name}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                <span>{sub.size_mb}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-xs text-gray-500 font-mono hidden md:flex items-center gap-1">
                                            <Clock size={12} /> {sub.upload_time}
                                        </div>
                                        <a 
                                            href={`http://localhost:5000/api/download/${sub.filename}`} 
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                                        >
                                            <Download size={16} /> Download
                                        </a>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-gray-500">No submissions found matching your search.</div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;