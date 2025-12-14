import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// NEW: Import Firebase functions
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // Import auth from your new file

// Updated icons for the Misinformation theme, including the new logo components
import { Code2, Eye, MessageSquare, Cpu, Lock as LockIcon, User, ArrowLeft, GanttChartSquare } from 'lucide-react'; 

const Login = () => {
  const navigate = useNavigate();
  // Renamed state to reflect Firebase's use of email as primary identifier
  const [emailOrUsername, setEmailOrUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Updated Background Icons (Focus on AI/Detection/Security)
  const backgroundIcons = [
    // Code (Red/Cyan)
    { Icon: Code2, x: "10%", y: "20%", delay: 0, color: "text-red-500/20" }, 
    // Eye (Detection/Vision - Pink/Red)
    { Icon: Eye, x: "85%", y: "15%", delay: 2, color: "text-pink-500/20" }, 
    // Message (Text Modality - Purple/Cyan)
    { Icon: MessageSquare, x: "15%", y: "75%", delay: 4, color: "text-purple-500/20" }, 
    // CPU (AI Processing - Red/Pink)
    { Icon: Cpu, x: "80%", y: "60%", delay: 1, color: "text-cyan-500/20" }, 
  ];


// CORRECTED handleLogin FUNCTION (Firebase Integration)
const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    // STEP 1: Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      emailOrUsername, // Passed as email
      password
    );
    const user = userCredential.user;

    // Get the secure token for the Flask backend
    const idToken = await user.getIdToken();

    // STEP 2: Call Flask to get the Role/Profile (Secure Token Exchange)
    const profileResponse = await fetch('http://localhost:5000/api/profile', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}` 
      },
    });

    const data = await profileResponse.json();

    if (profileResponse.ok) {
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('idToken', idToken);
      
      if (data.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/team-dashboard');
      }
    } else {
      setError(data.error || 'Login verification failed. Check Flask server logs.');
    }

  } catch (firebaseError) {
    console.error(firebaseError);
    if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
      setError('Invalid credentials.');
    } else if (firebaseError.code === 'auth/network-request-failed') {
      setError('Check your internet connection.');
    } else {
      setError('Authentication error. Check console for details.');
    }
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="w-full min-h-screen bg-[#050505] text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Images (Kept dark aesthetic) */}
       <div 
        className="absolute inset-0 z-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1544377987-920f69d7b43a?q=80&w=2670&auto=format&fit=crop')`, // New abstract/tech image
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div 
        className="absolute inset-0 z-0 opacity-100 mix-blend-soft-light pointer-events-none blur-[2px]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1596495578051-689e223d6a5d?q=80&w=2670&auto=format&fit=crop')`, // New abstract data/network image
          backgroundSize: 'cover',
          backgroundPosition: 'bottom',
        }}
      />

      {/* Floating Icons */}
      {backgroundIcons.map((item, index) => (
        <motion.div
          key={`icon-${index}`}
          className={`absolute z-0 ${item.color} pointer-events-none`}
          style={{ left: item.x, top: item.y }}
          animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
        >
          <item.Icon size={64} strokeWidth={1.5} />
        </motion.div>
      ))}

      {/* Central Glow behind the card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* =======================
          LOGIN CARD 
         ======================= */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-1"
      >
        {/* Card Border Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-3xl blur-sm" />
        
        {/* Card Shadow */}
        <div className="relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-red-900/20">
          
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to FactFusion Home
            </Link>
            
            {/* >>>>>>>>>>> THE ENHANCED LOGO COMPONENT <<<<<<<<<<< */}
            <div className="flex justify-center mb-4">
               <div className="p-3 bg-gradient-to-br from-red-600/30 to-pink-600/30 rounded-2xl border border-red-500/50 relative">
                  {/* Base Icon: Code (Data) - Stronger Red */}
                  <Code2 className="w-8 h-8 text-red-300" /> 
                  {/* Overlaid Icon: GanttChart (Fusion/Structure) - Brighter Pink */}
                  <GanttChartSquare className="w-5 h-5 text-pink-400 absolute -bottom-1 -right-1 p-0.5 bg-gray-900 rounded-md border border-red-500" />
               </div>
            </div>
            {/* >>>>>>>>>>> END LOGO COMPONENT <<<<<<<<<<< */}

            <h2 className="text-3xl font-black tracking-tight mb-2">
              {/* Title gradient updated to Red/Pink */}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-pink-400 to-purple-400">
                Project Access Portal
              </span>
            </h2>
            <p className="text-gray-400 text-sm">Enter your assigned credentials to access FactFusion.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Username (Focus color updated) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Username (Email)</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-red-400 transition-colors w-5 h-5" />
                <input 
                  type="text" 
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password (Focus color updated) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <LockIcon className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-red-400 transition-colors w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Message (Color kept Red) */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button (Gradient updated to Red/Pink) */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-red-900/20 relative overflow-hidden group ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {/* Background gradient updated to Red/Pink */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 transition-transform duration-300" />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center justify-center gap-2">
                 {isLoading ? 'Verifying...' : 'Access System'}
                 {!isLoading && <ArrowLeft className="w-4 h-4 rotate-180" />}
              </span>
            </motion.button>

          </form>

          {/* Footer Text (Branding updated) */}
          <div className="mt-8 text-center">
             <p className="text-xs text-gray-600">
               Protected by <span className="text-red-500/60">FactFusion SecureAuth</span>. <br /> 
               Issues? Contact support or system administrators.
             </p>
          </div>

        </div>
      </motion.div>

    </div>
  );
};

export default Login;