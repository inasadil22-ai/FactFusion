import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, User, ShieldCheck, Trophy, Terminal, FileText, Cpu, Lock, AlertTriangle, Clock, Upload, File, Check } from 'lucide-react';

const TeamDashboard = () => {
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [assignedChallenge, setAssignedChallenge] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [myUploads, setMyUploads] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { navigate('/login'); return; }
    
    const parsedUser = JSON.parse(storedUser);
    setTeamData(parsedUser);

    const fetchData = async () => {
        try {
            // Check Lock
            const lockRes = await fetch('http://localhost:5000/api/lock-status');
            const lockData = await lockRes.json();
            setIsLocked(lockData.isLocked);

            if (!lockData.isLocked) {
                // Fetch Challenge
                const response = await fetch(`http://localhost:5000/api/my-challenge/${parsedUser.username}`);
                const data = await response.json();
                setAssignedChallenge(data);

                // Fetch Upload History
                fetchUploads(parsedUser.username);
            }
        } catch (error) {
            console.error("Failed to fetch data");
        }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);

  }, [navigate]);

  const fetchUploads = async (username) => {
      try {
          const res = await fetch(`http://localhost:5000/api/my-uploads/${username}`);
          const data = await res.json();
          setMyUploads(data.reverse()); // Show newest first
      } catch (e) { console.error("Error fetching uploads"); }
  };

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          // Client-side Size Validation (50MB)
          if (file.size > 50 * 1024 * 1024) {
              alert("File size exceeds 50MB limit.");
              e.target.value = null; // Clear input
              return;
          }
          setSelectedFile(file);
          setUploadMessage("");
      }
  };

  const handleUpload = async (e) => {
      e.preventDefault();
      if (!selectedFile || !teamData) return;

      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('username', teamData.username); // Send username for filename generation

      try {
          const res = await fetch('http://localhost:5000/api/upload', {
              method: 'POST',
              body: formData
          });
          const data = await res.json();
          
          if (res.ok) {
              setUploadMessage("✅ Upload Successful!");
              setSelectedFile(null);
              // Refresh list
              fetchUploads(teamData.username);
          } else {
              setUploadMessage(`❌ Error: ${data.error}`);
          }
      } catch (error) {
          setUploadMessage("❌ Server Error");
      } finally {
          setUploading(false);
      }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!teamData) return null;

  // Locked State UI (Same as before)
  if (isLocked) {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px]" />
             <div className="relative z-10 bg-[#0a0a0a] border border-red-500/20 p-10 rounded-3xl max-w-2xl text-center shadow-2xl shadow-red-900/20">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500"><Lock size={40} /></div>
                <h1 className="text-4xl font-black mb-4">Dashboard Locked</h1>
                <p className="text-xl text-gray-400 mb-8">The coding period has ended. Access restricted.</p>
                <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">Logout</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-12 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-white/10 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 text-emerald-400 mb-2 font-mono text-sm tracking-wider uppercase"><Terminal size={16} /> Team Dashboard</div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight">Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-400">{teamData.name}</span></h1>
          </div>
          <button onClick={handleLogout} className="px-6 py-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-bold">Logout</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            {/* Team Members */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6"><Users size={20} className="text-emerald-400"/> <h2 className="text-xl font-bold">Team Members</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamData.members?.map((member, index) => (
                   <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs"><User size={14} /></div>
                      <span className="font-medium text-gray-200">{member}</span>
                   </div>
                ))}
              </div>
            </div>

            {/* Assigned Challenge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 min-h-[300px]">
               {assignedChallenge ? (
                   <div>
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3"><Cpu size={20} className="text-purple-400"/><h2 className="text-2xl font-black text-white">Assigned Challenge</h2></div>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">ACTIVE</span>
                       </div>
                       <h3 className="text-3xl font-bold text-white mb-4">{assignedChallenge.title}</h3>
                       <p className="text-gray-300 border-l-4 border-purple-500 pl-4 bg-white/5 py-4 pr-4 rounded-r-lg mb-6">{assignedChallenge.intro}</p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-white/5 rounded-xl p-5 border border-white/5"><h4 className="text-sm font-bold text-purple-400 uppercase mb-3">Requirements</h4><p className="text-sm text-gray-400">{assignedChallenge.req}</p></div>
                           <div className="bg-white/5 rounded-xl p-5 border border-white/5"><h4 className="text-sm font-bold text-lime-400 uppercase mb-3">Output</h4><p className="text-sm text-gray-400">{assignedChallenge.output}</p></div>
                       </div>
                   </div>
               ) : (
                   <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-50">
                       <Lock size={32} className="text-gray-500 mb-4" />
                       <h3 className="text-xl font-bold text-gray-300">Awaiting Allocation</h3>
                   </div>
               )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-span-1 space-y-6">
            
            {/* Project Guidelines */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><FileText size={20}/> Guidelines</h3>
              <ul className="space-y-4">
                {["Submit repo link/files by 5 PM.", "Allowed: .zip, .pdf, .py", "Max size: 50MB"].map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />{item}</li>
                ))}
              </ul>
            </div>

            {/* --- FILE UPLOAD SECTION --- */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 sticky top-24">
                <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Upload size={20}/> Submission</h3>
                
                <form onSubmit={handleUpload} className="mb-6">
                    <div className="relative mb-4">
                        <input 
                            type="file" 
                            onChange={handleFileChange}
                            accept=".zip,.tar.gz,.pdf,.py,.ipynb,.docx"
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                        />
                    </div>
                    
                    {selectedFile && (
                        <div className="text-xs text-gray-500 mb-2">
                           Selected: {selectedFile.name} ({(selectedFile.size / (1024*1024)).toFixed(2)} MB)
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={!selectedFile || uploading}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
                        ${!selectedFile ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-105'}`}
                    >
                        {uploading ? "Uploading..." : "Submit File"}
                    </button>
                    
                    {uploadMessage && (
                        <div className={`mt-3 text-sm text-center font-medium ${uploadMessage.includes('Success') ? 'text-emerald-400' : 'text-red-400'}`}>
                            {uploadMessage}
                        </div>
                    )}
                </form>

                {/* Upload History */}
                <div className="border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Submission History</div>
                    {myUploads.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {myUploads.map((file, idx) => (
                                <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5 flex items-start gap-3">
                                    <div className="p-2 bg-black rounded"><File size={14} className="text-gray-400"/></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate" title={file.filename}>{file.original_name}</div>
                                        <div className="text-xs text-gray-500 flex justify-between mt-1">
                                            <span>{file.upload_time.split(' ')[1]}</span>
                                            <span>{file.size_mb}</span>
                                        </div>
                                    </div>
                                    <Check size={14} className="text-emerald-500 mt-1" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-sm text-gray-600 italic py-2">No files uploaded yet.</div>
                    )}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDashboard;