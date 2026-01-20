import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios'; 
import CryptoJS from 'crypto-js'; 
import { 
  Lock as LockIcon, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Cpu,
  Bot
} from 'lucide-react'; 

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const backgroundIcons = [
    { Icon: FileText, x: "10%", y: "20%", delay: 0, color: "text-blue-500/10" },
    { Icon: Bot, x: "85%", y: "15%", delay: 2, color: "text-indigo-500/10" },
    { Icon: Cpu, x: "15%", y: "75%", delay: 4, color: "text-cyan-500/10" },
    { Icon: ShieldCheck, x: "80%", y: "60%", delay: 1, color: "text-blue-400/10" },
  ];

  useEffect(() => {
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, [isLogin]);

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
      setError("Credentials required for uplink.");
      return false;
    }
    if (!emailRegex.test(email)) {
      setError("Invalid identity format.");
      return false;
    }
    if (password.length < 6) {
      setError("Access key must be at least 6 characters.");
      return false;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Security keys do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const passwordHash = CryptoJS.SHA256(password).toString();
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      
      // SYNC WITH SERVER: Signup uses 'password_hash'
      const payload = isLogin 
        ? { email, password: passwordHash } 
        : { email, password_hash: passwordHash, role: 'standard' };

      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('accessToken', response.data.token || 'SESSION_ACTIVE'); 
      
      // Redirecting to home/hero
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || "Connection failure: Database offline.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* LAYOUT FIX: We use flex-grow so this fills the space in App.jsx.
       Removed fixed 'min-h-screen' to prevent the footer from jumping.
    */
    <div className="flex-grow flex flex-col items-center justify-center w-full relative overflow-hidden py-16 px-4">
      
      {/* Ambience Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,64,175,0.15),transparent_70%)] pointer-events-none" />
      
      {backgroundIcons.map(({ Icon, x, y, delay, color }, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, -30, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 8, delay, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute pointer-events-none ${color}`}
          style={{ left: x, top: y }}
        >
          <Icon size={60} strokeWidth={1} />
        </motion.div>
      ))}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-blue-900/30">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
                Portal Access
              </span>
            </h2>
            <div className="flex items-center justify-center gap-2 opacity-40">
              <ShieldCheck size={14} className="text-blue-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Secure Verification</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex mb-8 bg-blue-950/40 rounded-2xl p-1.5 border border-blue-500/10">
            <button
              onClick={() => setIsLogin(true)}
              type="button"
              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${isLogin ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' : 'text-blue-100/30 hover:text-white'}`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              type="button"
              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${!isLogin ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' : 'text-blue-100/30 hover:text-white'}`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest ml-1 block">Identity</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500/50 outline-none transition-all text-sm placeholder:text-white/10"
                  placeholder="operator@system.ai"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest ml-1 block">Access Key</label>
              <div className="relative group">
                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500/50 outline-none transition-all text-sm placeholder:text-white/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest ml-1 block">Confirm Key</label>
                  <div className="relative group">
                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500/50 outline-none transition-all text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 text-red-400 text-[10px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20 uppercase tracking-widest">
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? 'Processing...' : (isLogin ? 'Authorize Access' : 'Secure Registration')}
                {!isLoading && <ArrowRight size={16} />}
              </span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;