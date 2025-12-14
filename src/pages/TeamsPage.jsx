import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, ArrowRight, Users, Code, Hash } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const TeamsPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [teams, setTeams] = useState([]); // Store fetched teams here
  const [loading, setLoading] = useState(true);

  // --- FETCH TEAMS FROM BACKEND ---
  useEffect(() => {
    // We use the new API endpoint we created in server.py
    fetch('http://localhost:5000/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load teams. Is the backend running?", err);
        setLoading(false);
      });
  }, []);

  // Search Filter Logic
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.members.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500 selection:text-white font-sans">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        
        {/* Breadcrumbs */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-sm text-gray-500 mb-8 font-mono"
        >
          <Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <span className="opacity-50">/</span>
          <span className="text-emerald-500 font-medium">Teams</span>
        </motion.div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/10 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-black mb-2">
              Registered <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-400">Teams</span>
            </h1>
            <p className="text-gray-400 max-w-lg">
              View all participating innovators from our database.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative w-full md:w-96 group"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </motion.div>
        </div>

        {/* Teams Grid */}
        {loading ? (
           <div className="text-center py-20 text-gray-500 animate-pulse">Loading Team Data...</div>
        ) : filteredTeams.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTeams.map((team) => (
              <motion.div
                key={team.id}
                variants={cardVariants}
                whileHover={{ y: -8 }}
                className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden hover:border-emerald-500/30 transition-all"
              >
                {/* Internal Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex flex-col h-full">
                  {/* Card Header: Icon & ID */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-emerald-400 shadow-lg">
                      <Code size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border border-white/5 text-gray-500">
                      <Hash size={10} /> {team.id.toString().padStart(3, '0')}
                    </span>
                  </div>

                  {/* Team Info */}
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                    {team.name}
                  </h3>
                  
                  {/* Members List */}
                  <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <Users size={12} /> Members
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.members.map((member, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs font-medium text-gray-300 bg-black/40 px-2 py-1 rounded border border-white/5"
                        >
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Empty State */
          <div className="text-center py-24 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            <Users size={64} className="mb-4 opacity-20 mx-auto" />
            <p>No teams found matching "{searchTerm}"</p>
          </div>
        )}

        {/* Footer Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/10 pt-8"
        >
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white px-6 py-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={18} /> Back to Home
          </button>

          <button 
            onClick={() => navigate('/draw')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white px-6 py-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            Check Allocation Status <ArrowRight size={18} />
          </button>
        </motion.div>

      </div>
    </div>
  );
};

export default TeamsPage;